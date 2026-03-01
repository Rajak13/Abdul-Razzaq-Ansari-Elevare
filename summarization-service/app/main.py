"""
FastAPI Summarization Service

This service provides transformer-based text summarization capabilities
for the Elevare note-taking application. Supports BART and PEGASUS models.
"""

import os
from dotenv import load_dotenv

# Load environment variables FIRST before any other imports
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.requests import Request
from pydantic import BaseModel
from typing import Optional
from contextlib import asynccontextmanager
import uvicorn
import logging
from transformers import (
    PegasusForConditionalGeneration, 
    PegasusTokenizer,
    BartForConditionalGeneration,
    BartTokenizer,
    AutoTokenizer,
    AutoModelForSeq2SeqLM
)
import torch
import re
from typing import List, Dict, Any
import hashlib
import time
from collections import OrderedDict
import threading
import signal
import asyncio
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError

# Import optimization configurations AFTER loading .env
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.optimization import optimization_manager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Apply PyTorch optimizations
torch.set_num_threads(optimization_manager.performance_config.torch_threads)
if optimization_manager.performance_config.enable_half_precision:
    torch.backends.cudnn.benchmark = True

class SummaryCache:
    """
    In-memory cache for summarization results with LRU eviction policy.
    Thread-safe implementation for concurrent access.
    """
    
    def __init__(self, max_size: int = 100, ttl_seconds: int = 3600):
        """
        Initialize cache with size and TTL limits.
        
        Args:
            max_size: Maximum number of cached entries
            ttl_seconds: Time-to-live for cache entries in seconds
        """
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self._cache: OrderedDict[str, Dict[str, Any]] = OrderedDict()
        self._lock = threading.RLock()
        
        logger.info(f"Initialized cache with max_size={max_size}, ttl={ttl_seconds}s")
    
    def _generate_cache_key(self, text: str, max_length: int, min_length: int) -> str:
        """
        Generate a cache key from input parameters.
        
        Args:
            text: Input text to summarize
            max_length: Maximum summary length
            min_length: Minimum summary length
            
        Returns:
            str: SHA-256 hash as cache key
        """
        # Normalize text by stripping whitespace and converting to lowercase
        normalized_text = text.strip().lower()
        
        # Create key from text and parameters
        key_data = f"{normalized_text}|{max_length}|{min_length}"
        
        # Generate SHA-256 hash
        return hashlib.sha256(key_data.encode('utf-8')).hexdigest()
    
    def get(self, text: str, max_length: int, min_length: int) -> Optional[Dict[str, Any]]:
        """
        Retrieve cached summary if available and not expired.
        
        Args:
            text: Input text
            max_length: Maximum summary length
            min_length: Minimum summary length
            
        Returns:
            Optional[Dict]: Cached result or None if not found/expired
        """
        cache_key = self._generate_cache_key(text, max_length, min_length)
        
        with self._lock:
            if cache_key not in self._cache:
                return None
            
            entry = self._cache[cache_key]
            current_time = time.time()
            
            # Check if entry has expired
            if current_time - entry['timestamp'] > self.ttl_seconds:
                logger.debug(f"Cache entry expired for key: {cache_key[:8]}...")
                del self._cache[cache_key]
                return None
            
            # Move to end (most recently used)
            self._cache.move_to_end(cache_key)
            
            logger.info(f"Cache hit for key: {cache_key[:8]}...")
            return entry['result']
    
    def put(self, text: str, max_length: int, min_length: int, result: Dict[str, Any]) -> None:
        """
        Store result in cache with LRU eviction if needed.
        
        Args:
            text: Input text
            max_length: Maximum summary length
            min_length: Minimum summary length
            result: Summarization result to cache
        """
        cache_key = self._generate_cache_key(text, max_length, min_length)
        
        with self._lock:
            # Remove oldest entries if cache is full
            while len(self._cache) >= self.max_size:
                oldest_key = next(iter(self._cache))
                logger.debug(f"Evicting cache entry: {oldest_key[:8]}...")
                del self._cache[oldest_key]
            
            # Store new entry
            self._cache[cache_key] = {
                'result': result,
                'timestamp': time.time()
            }
            
            logger.info(f"Cached result for key: {cache_key[:8]}...")
    
    def clear(self) -> None:
        """Clear all cache entries."""
        with self._lock:
            self._cache.clear()
            logger.info("Cache cleared")
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics.
        
        Returns:
            Dict: Cache statistics including size, configuration
        """
        with self._lock:
            current_time = time.time()
            expired_count = 0
            
            # Count expired entries without removing them
            for entry in self._cache.values():
                if current_time - entry['timestamp'] > self.ttl_seconds:
                    expired_count += 1
            
            return {
                'current_size': len(self._cache),
                'max_size': self.max_size,
                'ttl_seconds': self.ttl_seconds,
                'expired_entries': expired_count,
                'utilization': len(self._cache) / self.max_size if self.max_size > 0 else 0
            }
    
    def cleanup_expired(self) -> int:
        """
        Remove expired entries from cache.
        
        Returns:
            int: Number of entries removed
        """
        with self._lock:
            current_time = time.time()
            expired_keys = []
            
            for key, entry in self._cache.items():
                if current_time - entry['timestamp'] > self.ttl_seconds:
                    expired_keys.append(key)
            
            for key in expired_keys:
                del self._cache[key]
            
            if expired_keys:
                logger.info(f"Cleaned up {len(expired_keys)} expired cache entries")
            
            return len(expired_keys)

class ModelWrapper:
    """
    Wrapper class for transformer model operations.
    Handles model loading, inference, error management, and caching.
    Supports both BART and PEGASUS models.
    """
    
    def __init__(self):
        self.model = None
        self.tokenizer = None
        
        # Use optimization manager for configuration
        self.model_name = optimization_manager.model_config.model_name
        self.model_type = os.getenv("MODEL_TYPE", "pegasus").lower()  # bart or pegasus
        self.max_tokens = optimization_manager.chunking_config.max_chunk_size
        self.chunk_overlap = optimization_manager.chunking_config.overlap_size
        self.device = optimization_manager.performance_config.model_device
        self.is_loaded = False
        
        # Adjust max_tokens based on model type
        if self.model_type == "bart":
            self.max_tokens = 1024  # BART supports up to 1024 tokens
        
        # Size limits for input validation
        self.max_input_chars = int(os.getenv("MAX_INPUT_CHARS", "100000"))  # 100k characters
        self.max_chunks = optimization_manager.chunking_config.max_chunks
        self.max_tokens_per_chunk = self.max_tokens - 100  # Reserve tokens for special tokens
        
        # Initialize cache with optimization settings
        cache_params = optimization_manager.get_cache_params()
        self.cache = SummaryCache(
            max_size=cache_params["max_cache_size"],
            ttl_seconds=cache_params["cache_ttl"]
        ) if cache_params["enable_cache"] else None
        
        # Timeout settings
        self.inference_timeout = optimization_manager.performance_config.request_timeout
    
    async def load_model(self):
        """
        Load transformer model and tokenizer at startup with comprehensive error handling.
        Supports both BART and PEGASUS models.
        
        Raises:
            RuntimeError: If model loading fails with categorized error message
        """
        try:
            logger.info(f"Loading {self.model_type.upper()} model: {self.model_name}")
            logger.info(f"Using device: {self.device}")
            
            # Check system resources before loading
            try:
                resources = self.get_system_resources()
                logger.info(f"System resources - CPU: {resources['cpu_percent']:.1f}%, "
                          f"Memory: {resources['memory_percent']:.1f}%, "
                          f"Available Memory: {resources['available_memory_gb']:.1f}GB")
                
                # Warn if system resources are low
                if resources['memory_percent'] > 90:
                    logger.warning("System memory usage is very high, model loading may fail")
                
                if resources['available_memory_gb'] < 2:
                    logger.warning("Less than 2GB memory available, model loading may fail")
                    
            except Exception as e:
                logger.warning(f"Could not check system resources: {str(e)}")
            
            # Load tokenizer with timeout
            logger.info("Loading tokenizer...")
            def load_tokenizer():
                if self.model_type == "bart":
                    return BartTokenizer.from_pretrained(self.model_name)
                else:  # pegasus
                    return PegasusTokenizer.from_pretrained(self.model_name)
            
            self.tokenizer = self._run_with_timeout(load_tokenizer, 600)  # 10 minute timeout for tokenizer
            logger.info("Tokenizer loaded successfully")
            
            # Load model with timeout and optimization settings
            logger.info("Loading model...")
            def load_model():
                if self.model_type == "bart":
                    model = BartForConditionalGeneration.from_pretrained(self.model_name)
                else:  # pegasus
                    model = PegasusForConditionalGeneration.from_pretrained(self.model_name)
                
                model.to(self.device)
                model.eval()  # Set to evaluation mode
                
                # Apply half precision if enabled
                if optimization_manager.performance_config.enable_half_precision and self.device == "cuda":
                    model = model.half()
                    logger.info("Applied half precision optimization")
                
                return model
            
            self.model = self._run_with_timeout(load_model, 1800)  # 30 minute timeout for model loading
            logger.info("Model loaded successfully")
            
            self.is_loaded = True
            logger.info(f"{self.model_type.upper()} model initialization complete")
            
            # Log final resource usage
            try:
                final_resources = self.get_system_resources()
                logger.info(f"Post-loading resources - Memory: {final_resources['memory_percent']:.1f}%")
                if final_resources.get('gpu_available'):
                    logger.info(f"GPU Memory: {final_resources['gpu_memory_allocated_gb']:.1f}GB allocated")
            except Exception:
                pass  # Don't fail if resource checking fails
            
        except Exception as e:
            logger.error(f"Failed to load {self.model_type.upper()} model: {str(e)}")
            self.is_loaded = False
            self._handle_model_loading_error(e)
    
    def get_model_info(self):
        """
        Get information about the loaded model and cache status.
        
        Returns:
            dict: Model information including name, device, status, and cache stats
        """
        info = {
            "model_name": self.model_name,
            "device": self.device,
            "max_tokens": self.max_tokens,
            "chunk_overlap": self.chunk_overlap,
            "is_loaded": self.is_loaded,
            "cuda_available": torch.cuda.is_available(),
            "max_input_chars": self.max_input_chars,
            "max_chunks": self.max_chunks,
            "inference_timeout": self.inference_timeout
        }
        
        # Add cache statistics if cache is enabled
        if self.cache:
            info["cache_stats"] = self.cache.get_stats()
        else:
            info["cache_stats"] = {"enabled": False}
        
        return info
    
    def validate_input_size(self, text: str) -> None:
        """
        Validate input text size against various limits.
        
        Args:
            text: Input text to validate
            
        Raises:
            HTTPException: If input exceeds size limits
        """
        # Check character limit
        if len(text) > self.max_input_chars:
            raise HTTPException(
                status_code=413,
                detail={
                    "error": "Input text exceeds maximum character limit",
                    "code": "TEXT_TOO_LONG",
                    "max_chars": self.max_input_chars,
                    "current_chars": len(text)
                }
            )
        
        # Check if text would result in too many chunks
        estimated_chunks = self._estimate_chunk_count(text)
        if estimated_chunks > self.max_chunks:
            raise HTTPException(
                status_code=413,
                detail={
                    "error": "Input text would require too many chunks to process",
                    "code": "TOO_MANY_CHUNKS",
                    "max_chunks": self.max_chunks,
                    "estimated_chunks": estimated_chunks,
                    "suggestion": f"Try reducing text to approximately {self.max_input_chars // 2} characters"
                }
            )
        
        # Check for extremely long single sentences that can't be chunked effectively
        sentences = self._split_into_sentences(text)
        for i, sentence in enumerate(sentences):
            sentence_tokens = self.count_tokens(sentence)
            if sentence_tokens > self.max_tokens_per_chunk * 2:  # Allow some flexibility
                raise HTTPException(
                    status_code=422,
                    detail={
                        "error": "Input contains sentences that are too long to process effectively",
                        "code": "SENTENCE_TOO_LONG",
                        "sentence_index": i,
                        "sentence_tokens": sentence_tokens,
                        "max_tokens_per_chunk": self.max_tokens_per_chunk,
                        "suggestion": "Try breaking up very long sentences or paragraphs"
                    }
                )
    
    def _estimate_chunk_count(self, text: str) -> int:
        """
        Estimate how many chunks the text would be split into.
        
        Args:
            text: Input text to estimate
            
        Returns:
            int: Estimated number of chunks
        """
        total_tokens = self.count_tokens(text)
        if total_tokens <= self.max_tokens_per_chunk:
            return 1
        
        # Rough estimation accounting for overlap
        effective_chunk_size = self.max_tokens_per_chunk - self.chunk_overlap
        return max(1, (total_tokens + effective_chunk_size - 1) // effective_chunk_size)
    def check_model_ready(self):
        """
        Check if model is ready for inference.
        
        Raises:
            HTTPException: If model is not loaded
        """
        if not self.is_loaded or self.model is None or self.tokenizer is None:
            raise HTTPException(
                status_code=503,
                detail="Model not loaded. Service is not ready for inference."
            )
    
    def count_tokens(self, text: str) -> int:
        """
        Count the number of tokens in the given text.
        
        Args:
            text: Input text to count tokens for
            
        Returns:
            int: Number of tokens
        """
        if not self.tokenizer:
            return len(text.split())  # Fallback to word count
        
        tokens = self.tokenizer.encode(text, add_special_tokens=True)
        return len(tokens)
    
    def chunk_text(self, text: str) -> List[str]:
        """
        Split text into chunks that fit within the model's token limit.
        Uses intelligent splitting with overlap to maintain context.
        
        Args:
            text: Input text to chunk
            
        Returns:
            List[str]: List of text chunks
        """
        # If text is short enough, return as single chunk
        if self.count_tokens(text) <= self.max_tokens:
            return [text]
        
        chunks = []
        
        # Split text into sentences for better chunking
        sentences = self._split_into_sentences(text)
        
        current_chunk = ""
        current_tokens = 0
        
        for sentence in sentences:
            sentence_tokens = self.count_tokens(sentence)
            
            # If single sentence exceeds limit, split it further
            if sentence_tokens > self.max_tokens:
                # If we have accumulated content, save it first
                if current_chunk:
                    chunks.append(current_chunk.strip())
                    current_chunk = ""
                    current_tokens = 0
                
                # Split long sentence by words
                word_chunks = self._split_long_sentence(sentence)
                chunks.extend(word_chunks)
                continue
            
            # Check if adding this sentence would exceed limit
            if current_tokens + sentence_tokens > self.max_tokens:
                # Save current chunk
                if current_chunk:
                    chunks.append(current_chunk.strip())
                
                # Start new chunk with overlap
                overlap_text = self._get_overlap_text(current_chunk)
                current_chunk = overlap_text + sentence
                current_tokens = self.count_tokens(current_chunk)
            else:
                # Add sentence to current chunk
                current_chunk += " " + sentence if current_chunk else sentence
                current_tokens += sentence_tokens
        
        # Add final chunk if it has content
        if current_chunk.strip():
            chunks.append(current_chunk.strip())
        
        return chunks
    
    def _split_into_sentences(self, text: str) -> List[str]:
        """
        Split text into sentences using regex patterns.
        
        Args:
            text: Input text to split
            
        Returns:
            List[str]: List of sentences
        """
        # Simple sentence splitting pattern
        sentence_pattern = r'(?<=[.!?])\s+'
        sentences = re.split(sentence_pattern, text.strip())
        
        # Filter out empty sentences and clean up
        sentences = [s.strip() for s in sentences if s.strip()]
        
        return sentences
    
    def _split_long_sentence(self, sentence: str) -> List[str]:
        """
        Split a sentence that's too long into smaller chunks by words.
        
        Args:
            sentence: Long sentence to split
            
        Returns:
            List[str]: List of word-based chunks
        """
        words = sentence.split()
        chunks = []
        current_chunk = ""
        
        for word in words:
            test_chunk = current_chunk + " " + word if current_chunk else word
            
            if self.count_tokens(test_chunk) > self.max_tokens:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                    current_chunk = word
                else:
                    # Single word exceeds limit - add it anyway
                    chunks.append(word)
                    current_chunk = ""
            else:
                current_chunk = test_chunk
        
        if current_chunk.strip():
            chunks.append(current_chunk.strip())
        
        return chunks
    
    def _get_overlap_text(self, text: str) -> str:
        """
        Get overlap text from the end of a chunk to maintain context.
        
        Args:
            text: Source text to extract overlap from
            
        Returns:
            str: Overlap text
        """
        if not text:
            return ""
        
        words = text.split()
        if len(words) <= self.chunk_overlap:
            return text
        
        overlap_words = words[-self.chunk_overlap:]
        return " ".join(overlap_words)
    
    def merge_summaries(self, summaries: List[str]) -> str:
        """
        Merge multiple chunk summaries into a single consolidated summary.
        
        Args:
            summaries: List of individual chunk summaries
            
        Returns:
            str: Consolidated summary
        """
        if not summaries:
            return ""
        
        if len(summaries) == 1:
            return summaries[0]
        
        # Combine all summaries with separators
        combined_text = " ".join(summaries)
        
        # If combined text is short enough, summarize it again
        if self.count_tokens(combined_text) <= self.max_tokens:
            try:
                # Tokenize combined summaries
                inputs = self.tokenizer.encode(
                    combined_text,
                    return_tensors="pt",
                    max_length=self.max_tokens,
                    truncation=True
                ).to(self.device)
                
                # Generate final consolidated summary
                with torch.no_grad():
                    summary_ids = self.model.generate(
                        inputs,
                        max_length=150,  # Standard length for final summary
                        min_length=50,
                        length_penalty=2.0,
                        num_beams=4,
                        early_stopping=True
                    )
                
                final_summary = self.tokenizer.decode(
                    summary_ids[0],
                    skip_special_tokens=True
                )
                
                return final_summary
                
            except Exception as e:
                logger.warning(f"Failed to consolidate summaries: {str(e)}")
                # Fallback to simple concatenation
                return self._simple_merge(summaries)
        else:
            # If combined text is too long, use simple merging
            return self._simple_merge(summaries)
    
    def _simple_merge(self, summaries: List[str]) -> str:
        """
        Simple merging strategy that concatenates summaries with deduplication.
        
        Args:
            summaries: List of summaries to merge
            
        Returns:
            str: Merged summary
        """
        # Remove duplicate sentences across summaries
        all_sentences = []
        seen_sentences = set()
        
        for summary in summaries:
            sentences = self._split_into_sentences(summary)
            for sentence in sentences:
                # Normalize sentence for comparison
                normalized = sentence.lower().strip()
                if normalized not in seen_sentences and len(normalized) > 10:
                    all_sentences.append(sentence)
                    seen_sentences.add(normalized)
        
        return " ".join(all_sentences)
    
    def get_cached_summary(self, text: str, max_length: int, min_length: int) -> Optional[Dict[str, Any]]:
        """
        Check if a cached summary exists for the given input.
        
        Args:
            text: Input text to check
            max_length: Maximum summary length
            min_length: Minimum summary length
            
        Returns:
            Optional[Dict]: Cached result or None if not found or cache disabled
        """
        if not self.cache:
            return None
        return self.cache.get(text, max_length, min_length)
    
    def cache_summary(self, text: str, max_length: int, min_length: int, result: Dict[str, Any]) -> None:
        """
        Cache a summarization result.
        
        Args:
            text: Input text
            max_length: Maximum summary length
            min_length: Minimum summary length
            result: Summarization result to cache
        """
        if self.cache:
            self.cache.put(text, max_length, min_length, result)
    
    def clear_cache(self) -> None:
        """Clear all cached summaries."""
        if self.cache:
            self.cache.clear()
    
    def cleanup_expired_cache(self) -> int:
        """
        Remove expired entries from cache.
        
        Returns:
            int: Number of entries removed
        """
        if self.cache:
            return self.cache.cleanup_expired()
        return 0
    
    def _run_with_timeout(self, func, timeout_seconds: int, *args, **kwargs):
        """
        Run a function with timeout using ThreadPoolExecutor.
        
        Args:
            func: Function to execute
            timeout_seconds: Timeout in seconds
            *args: Function arguments
            **kwargs: Function keyword arguments
            
        Returns:
            Function result
            
        Raises:
            TimeoutError: If function execution exceeds timeout
            Exception: Any exception raised by the function
        """
        with ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(func, *args, **kwargs)
            try:
                return future.result(timeout=timeout_seconds)
            except FuturesTimeoutError:
                # Cancel the future (though it may not stop immediately)
                future.cancel()
                raise TimeoutError(f"Operation timed out after {timeout_seconds} seconds")
    
    def _safe_model_inference(self, inputs, max_length: int, min_length: int):
        """
        Perform model inference with comprehensive error handling.
        
        Args:
            inputs: Tokenized input tensor
            max_length: Maximum summary length
            min_length: Minimum summary length
            
        Returns:
            Generated summary tensor
            
        Raises:
            Various exceptions for different failure modes
        """
        try:
            # Check GPU memory before inference if using CUDA
            if self.device == "cuda" and torch.cuda.is_available():
                torch.cuda.empty_cache()  # Clear cache before inference
                
                # Check available memory
                memory_allocated = torch.cuda.memory_allocated()
                memory_reserved = torch.cuda.memory_reserved()
                memory_free = torch.cuda.get_device_properties(0).total_memory - memory_reserved
                
                logger.debug(f"GPU Memory - Allocated: {memory_allocated/1e9:.2f}GB, "
                           f"Reserved: {memory_reserved/1e9:.2f}GB, "
                           f"Free: {memory_free/1e9:.2f}GB")
                
                # Warn if memory is low
                if memory_free < 1e9:  # Less than 1GB free
                    logger.warning("Low GPU memory available, inference may fail")
            
            # Perform inference with timeout and optimization settings
            def inference():
                with torch.no_grad():
                    # Get optimized generation parameters
                    generation_kwargs = optimization_manager.get_model_kwargs()
                    generation_kwargs.update({
                        "max_length": max_length,
                        "min_length": min_length,
                        "pad_token_id": self.tokenizer.pad_token_id,
                        "eos_token_id": self.tokenizer.eos_token_id
                    })
                    
                    return self.model.generate(inputs, **generation_kwargs)
            
            # Run inference with timeout
            return self._run_with_timeout(inference, self.inference_timeout)
            
        except torch.cuda.OutOfMemoryError as e:
            # Clear cache and provide specific error
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            
            raise RuntimeError(
                f"GPU out of memory during inference. "
                f"Try reducing text length or restarting the service. "
                f"Error: {str(e)}"
            )
        
        except TimeoutError as e:
            logger.error(f"Model inference timed out: {str(e)}")
            raise RuntimeError(
                f"Model inference timed out after {self.inference_timeout} seconds. "
                f"Try reducing text length or increasing timeout."
            )
        
        except RuntimeError as e:
            if "CUDA" in str(e) or "GPU" in str(e):
                logger.error(f"CUDA runtime error: {str(e)}")
                raise RuntimeError(f"GPU processing error: {str(e)}")
            else:
                logger.error(f"Model runtime error: {str(e)}")
                raise RuntimeError(f"Model processing error: {str(e)}")
        
        except Exception as e:
            logger.error(f"Unexpected error during model inference: {str(e)}")
            raise RuntimeError(f"Unexpected model error: {str(e)}")
    
    def _handle_model_loading_error(self, error: Exception) -> None:
        """
        Handle and categorize model loading errors.
        
        Args:
            error: The exception that occurred during model loading
            
        Raises:
            Specific exception types based on error category
        """
        error_str = str(error).lower()
        
        if "out of memory" in error_str or "cuda out of memory" in error_str:
            raise RuntimeError(
                "Insufficient GPU memory to load model. "
                "Try using CPU mode or a machine with more GPU memory."
            )
        
        elif "connection" in error_str or "network" in error_str or "timeout" in error_str:
            raise RuntimeError(
                "Network error while downloading model. "
                "Check internet connection and try again."
            )
        
        elif "permission" in error_str or "access" in error_str:
            raise RuntimeError(
                "Permission error accessing model files. "
                "Check file permissions and disk space."
            )
        
        elif "disk" in error_str or "space" in error_str:
            raise RuntimeError(
                "Insufficient disk space to download/cache model. "
                "Free up disk space and try again."
            )
        
        elif "model" in error_str and ("not found" in error_str or "404" in error_str):
            raise RuntimeError(
                f"Model '{self.model_name}' not found. "
                f"Check model name and availability."
            )
        
        else:
            raise RuntimeError(f"Failed to load model: {str(error)}")
    
    def get_system_resources(self) -> Dict[str, Any]:
        """
        Get current system resource usage.
        
        Returns:
            Dict: System resource information
        """
        import psutil
        
        resources = {
            "cpu_percent": psutil.cpu_percent(interval=1),
            "memory_percent": psutil.virtual_memory().percent,
            "available_memory_gb": psutil.virtual_memory().available / (1024**3)
        }
        
        # Add GPU info if available
        if torch.cuda.is_available():
            try:
                resources.update({
                    "gpu_available": True,
                    "gpu_memory_allocated_gb": torch.cuda.memory_allocated() / (1024**3),
                    "gpu_memory_reserved_gb": torch.cuda.memory_reserved() / (1024**3),
                    "gpu_memory_total_gb": torch.cuda.get_device_properties(0).total_memory / (1024**3)
                })
            except Exception as e:
                logger.warning(f"Failed to get GPU memory info: {str(e)}")
                resources["gpu_available"] = False
        else:
            resources["gpu_available"] = False
        
        return resources

# Global model wrapper instance
model_wrapper = ModelWrapper()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for FastAPI application.
    Handles model loading at startup and cleanup at shutdown with proper error handling.
    """
    # Startup
    startup_success = False
    try:
        logger.info("Starting Summarization Service...")
        
        # Set up signal handlers for graceful shutdown
        def signal_handler(signum, frame):
            logger.info(f"Received signal {signum}, initiating graceful shutdown...")
        
        signal.signal(signal.SIGTERM, signal_handler)
        signal.signal(signal.SIGINT, signal_handler)
        
        # Load model with comprehensive error handling
        await model_wrapper.load_model()
        startup_success = True
        
        # Print optimization configuration
        optimization_manager.print_configuration()
        
        logger.info("Service startup complete - ready to accept requests")
        
        yield
        
    except Exception as e:
        logger.error(f"Failed to start service: {str(e)}")
        if not startup_success:
            # If startup failed, we should still yield to allow FastAPI to start
            # but the service will report as unhealthy
            logger.error("Service starting in degraded mode - model not loaded")
            yield
        else:
            raise
    finally:
        # Shutdown
        logger.info("Shutting down Summarization Service...")
        
        try:
            # Clear cache
            if hasattr(model_wrapper, 'cache') and model_wrapper.cache:
                model_wrapper.cache.clear()
                logger.info("Cache cleared")
            
            # Clean up GPU memory
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                logger.info("GPU cache cleared")
            
            # Clean up model resources
            if model_wrapper.model is not None:
                del model_wrapper.model
                logger.info("Model unloaded")
                
            if model_wrapper.tokenizer is not None:
                del model_wrapper.tokenizer
                logger.info("Tokenizer unloaded")
            
            # Force garbage collection
            import gc
            gc.collect()
            
            logger.info("Service shutdown complete")
            
        except Exception as e:
            logger.error(f"Error during shutdown: {str(e)}")
            # Don't raise during shutdown

# Initialize FastAPI app with lifespan events
app = FastAPI(
    title="AI Summarization Service",
    description="AI-powered text summarization using BART or PEGASUS transformer models",
    version="2.0.0",
    lifespan=lifespan
)

# Add CORS middleware for Next.js integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handler for unhandled exceptions
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Global exception handler to catch and log unhandled exceptions.
    
    Args:
        request: The request that caused the exception
        exc: The unhandled exception
        
    Returns:
        JSONResponse: Structured error response
    """
    logger.error(f"Unhandled exception in {request.method} {request.url}: {str(exc)}")
    logger.error(f"Exception type: {type(exc).__name__}")
    
    # Don't expose internal details in production
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "code": "UNHANDLED_EXCEPTION",
            "message": "An unexpected error occurred",
            "suggestion": "Please try again or contact support if the problem persists"
        }
    )

# Custom exception handler for HTTP exceptions to ensure consistent format
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """
    Custom HTTP exception handler to ensure consistent error response format.
    
    Args:
        request: The request that caused the exception
        exc: The HTTP exception
        
    Returns:
        JSONResponse: Structured error response
    """
    # If detail is already a dict, use it as is
    if isinstance(exc.detail, dict):
        content = exc.detail
    else:
        # Convert string detail to structured format
        content = {
            "error": exc.detail,
            "code": f"HTTP_{exc.status_code}",
            "status_code": exc.status_code
        }
    
    return JSONResponse(
        status_code=exc.status_code,
        content=content
    )

# Request/Response models
class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    model_loaded: bool

class ModelInfoResponse(BaseModel):
    model_name: str
    device: str
    max_tokens: int
    chunk_overlap: int
    is_loaded: bool
    cuda_available: bool
    max_input_chars: int
    max_chunks: int
    inference_timeout: int
    cache_stats: Optional[Dict[str, Any]] = None

class SummarizationRequest(BaseModel):
    text: str
    max_length: Optional[int] = 150
    min_length: Optional[int] = 50

class SummarizationResponse(BaseModel):
    summary: str
    processing_time: float
    chunks_processed: int
    model: str
    failed_chunks: Optional[List[int]] = None
    warnings: Optional[List[str]] = None

class ErrorResponse(BaseModel):
    error: str
    code: str
    details: Optional[str] = None

# Health check endpoint
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint to verify service availability.
    
    Returns:
        HealthResponse: Service status information including model status
    """
    return HealthResponse(
        status="healthy" if model_wrapper.is_loaded else "starting",
        service="PEGASUS Summarization Service",
        version="1.0.0",
        model_loaded=model_wrapper.is_loaded
    )

# Model info endpoint
@app.get("/model-info", response_model=ModelInfoResponse)
async def get_model_info():
    """
    Get information about the loaded PEGASUS model.
    
    Returns:
        ModelInfoResponse: Detailed model information
    """
    return ModelInfoResponse(**model_wrapper.get_model_info())

# Root endpoint
@app.get("/")
async def root():
    """
    Root endpoint with service information.
    
    Returns:
        dict: Basic service information
    """
    return {
        "message": "AI Summarization Service",
        "version": "2.0.0",
        "model_type": model_wrapper.model_type if model_wrapper.is_loaded else "not loaded",
        "model_name": model_wrapper.model_name if model_wrapper.is_loaded else "not loaded",
        "endpoints": {
            "health": "/health",
            "model-info": "/model-info",
            "summarize": "/summarize"
        }
    }

# Cache management endpoints
@app.get("/cache/stats")
async def get_cache_stats():
    """
    Get cache statistics and configuration.
    
    Returns:
        dict: Cache statistics including size, utilization, and configuration
    """
    return {
        "cache_stats": model_wrapper.cache.get_stats(),
        "cache_enabled": True
    }

@app.post("/cache/clear")
async def clear_cache():
    """
    Clear all cached summaries.
    
    Returns:
        dict: Confirmation message
    """
    model_wrapper.clear_cache()
    return {"message": "Cache cleared successfully"}

@app.post("/cache/cleanup")
async def cleanup_cache():
    """
    Remove expired entries from cache.
    
    Returns:
        dict: Number of entries removed
    """
    removed_count = model_wrapper.cleanup_expired_cache()
    return {
        "message": f"Cache cleanup completed",
        "entries_removed": removed_count
    }

# System monitoring endpoints
@app.get("/system/resources")
async def get_system_resources():
    """
    Get current system resource usage.
    
    Returns:
        dict: System resource information including CPU, memory, and GPU usage
    """
    try:
        resources = model_wrapper.get_system_resources()
        return {
            "resources": resources,
            "timestamp": time.time()
        }
    except Exception as e:
        logger.error(f"Failed to get system resources: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve system resources"
        )

@app.get("/system/health-detailed")
async def detailed_health_check():
    """
    Detailed health check including system resources and model status.
    
    Returns:
        dict: Comprehensive health information
    """
    try:
        health_info = {
            "status": "healthy" if model_wrapper.is_loaded else "starting",
            "service": "PEGASUS Summarization Service",
            "version": "1.0.0",
            "model_loaded": model_wrapper.is_loaded,
            "model_info": model_wrapper.get_model_info() if model_wrapper.is_loaded else None,
            "timestamp": time.time()
        }
        
        # Add system resources if available
        try:
            health_info["system_resources"] = model_wrapper.get_system_resources()
        except Exception as e:
            logger.warning(f"Could not get system resources for health check: {str(e)}")
            health_info["system_resources"] = {"error": "unavailable"}
        
        return health_info
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Health check failed"
        )

@app.post("/summarize", response_model=SummarizationResponse)
async def summarize_text(request: SummarizationRequest):
    """
    Generate abstractive summary using BART or PEGASUS model.
    Handles long texts by chunking and consolidating summaries.
    
    Args:
        request: SummarizationRequest with text to summarize
        
    Returns:
        SummarizationResponse: Generated summary with metadata
        
    Raises:
        HTTPException: If model is not ready or input validation fails
    """
    import time
    
    # Check if model is ready
    model_wrapper.check_model_ready()
    
    # Input validation
    if not request.text or not request.text.strip():
        raise HTTPException(
            status_code=400,
            detail="Input text cannot be empty"
        )
    
    # Comprehensive input size validation
    model_wrapper.validate_input_size(request.text)
    
    # Check cache first
    cached_result = model_wrapper.get_cached_summary(
        request.text, 
        request.max_length or 150, 
        request.min_length or 50
    )
    
    if cached_result:
        logger.info("Returning cached summary result")
        return SummarizationResponse(**cached_result)
    
    try:
        start_time = time.time()
        
        # Clean and prepare input text
        input_text = request.text.strip()
        
        # Check if text needs chunking
        text_chunks = model_wrapper.chunk_text(input_text)
        logger.info(f"Text split into {len(text_chunks)} chunks")
        
        # Additional validation after chunking
        if len(text_chunks) > model_wrapper.max_chunks:
            raise HTTPException(
                status_code=413,
                detail={
                    "error": "Text resulted in too many chunks after processing",
                    "code": "CHUNK_LIMIT_EXCEEDED",
                    "chunks_created": len(text_chunks),
                    "max_chunks": model_wrapper.max_chunks
                }
            )
        
        chunk_summaries = []
        failed_chunks = []
        
        # Process each chunk with individual error handling
        for i, chunk in enumerate(text_chunks):
            try:
                logger.info(f"Processing chunk {i+1}/{len(text_chunks)}")
                
                # Validate chunk size
                chunk_tokens = model_wrapper.count_tokens(chunk)
                if chunk_tokens > model_wrapper.max_tokens:
                    logger.warning(f"Chunk {i+1} exceeds token limit ({chunk_tokens} > {model_wrapper.max_tokens}), truncating")
                
                # Tokenize chunk with proper truncation BEFORE creating tensor
                # This prevents the "index out of range" error
                inputs = model_wrapper.tokenizer(
                    chunk,
                    return_tensors="pt",
                    max_length=model_wrapper.max_tokens,
                    truncation=True,
                    padding=False
                ).input_ids.to(model_wrapper.device)
                
                # Generate summary for this chunk using safe inference
                summary_ids = model_wrapper._safe_model_inference(
                    inputs,
                    request.max_length or 150,
                    request.min_length or 50
                )
                
                # Decode chunk summary
                chunk_summary = model_wrapper.tokenizer.decode(
                    summary_ids[0],
                    skip_special_tokens=True
                )
                
                chunk_summaries.append(chunk_summary)
                
            except torch.cuda.OutOfMemoryError as e:
                logger.error(f"CUDA out of memory processing chunk {i+1}: {str(e)}")
                failed_chunks.append(i+1)
                # Clear cache and continue with other chunks
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
                continue
                
            except TimeoutError as e:
                logger.error(f"Timeout processing chunk {i+1}: {str(e)}")
                failed_chunks.append(i+1)
                continue
                
            except RuntimeError as e:
                logger.error(f"Runtime error processing chunk {i+1}: {str(e)}")
                failed_chunks.append(i+1)
                continue
                
            except Exception as e:
                logger.error(f"Unexpected error processing chunk {i+1}: {str(e)}")
                failed_chunks.append(i+1)
                continue
        
        # Check if we have any successful summaries
        if not chunk_summaries:
            raise HTTPException(
                status_code=500,
                detail={
                    "error": "Failed to process any chunks successfully",
                    "code": "ALL_CHUNKS_FAILED",
                    "total_chunks": len(text_chunks),
                    "failed_chunks": failed_chunks
                }
            )
        
        # Warn if some chunks failed
        if failed_chunks:
            logger.warning(f"Failed to process {len(failed_chunks)} out of {len(text_chunks)} chunks: {failed_chunks}")
        
        # Merge chunk summaries if multiple chunks
        if len(chunk_summaries) > 1:
            try:
                final_summary = model_wrapper.merge_summaries(chunk_summaries)
                logger.info("Successfully merged chunk summaries")
            except Exception as e:
                logger.error(f"Failed to merge summaries: {str(e)}")
                # Fallback to simple concatenation
                final_summary = " ".join(chunk_summaries)
        else:
            final_summary = chunk_summaries[0]
        
        processing_time = time.time() - start_time
        
        # Prepare warnings if any chunks failed
        warnings = []
        if failed_chunks:
            warnings.append(f"Failed to process {len(failed_chunks)} out of {len(text_chunks)} chunks")
        
        logger.info(f"Successfully generated summary in {processing_time:.2f}s")
        
        # Create response object
        response = SummarizationResponse(
            summary=final_summary,
            processing_time=processing_time,
            chunks_processed=len(chunk_summaries),
            model=f"{model_wrapper.model_type.upper()}: {model_wrapper.model_name}",
            failed_chunks=failed_chunks if failed_chunks else None,
            warnings=warnings if warnings else None
        )
        
        # Cache the successful result (only if no chunks failed)
        if not failed_chunks:
            try:
                model_wrapper.cache_summary(
                    request.text,
                    request.max_length or 150,
                    request.min_length or 50,
                    response.dict()
                )
            except Exception as cache_error:
                logger.warning(f"Failed to cache result: {str(cache_error)}")
                # Don't fail the request if caching fails
        
        return response
        
    except torch.cuda.OutOfMemoryError as e:
        logger.error(f"CUDA out of memory during summarization: {str(e)}")
        # Clear GPU cache
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        raise HTTPException(
            status_code=507,
            detail={
                "error": "Insufficient GPU memory for processing",
                "code": "GPU_OUT_OF_MEMORY",
                "suggestion": "Try with shorter text or restart the service to free GPU memory"
            }
        )
        
    except TimeoutError as e:
        logger.error(f"Summarization timed out: {str(e)}")
        raise HTTPException(
            status_code=408,
            detail={
                "error": "Request timed out during processing",
                "code": "PROCESSING_TIMEOUT",
                "timeout_seconds": model_wrapper.inference_timeout,
                "suggestion": "Try with shorter text or increase timeout configuration"
            }
        )
        
    except RuntimeError as e:
        logger.error(f"Runtime error during summarization: {str(e)}")
        error_str = str(e).lower()
        
        if "gpu" in error_str or "cuda" in error_str:
            status_code = 507
            error_code = "GPU_ERROR"
        elif "memory" in error_str:
            status_code = 507
            error_code = "MEMORY_ERROR"
        elif "timeout" in error_str:
            status_code = 408
            error_code = "TIMEOUT_ERROR"
        else:
            status_code = 500
            error_code = "RUNTIME_ERROR"
            
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": "Runtime error during processing",
                "code": error_code,
                "message": str(e),
                "suggestion": "Try with shorter text or restart the service"
            }
        )
        
    except Exception as e:
        logger.error(f"Unexpected error during summarization: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Internal server error during summarization",
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred",
                "suggestion": "Please try again or contact support if the problem persists"
            }
        )

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )