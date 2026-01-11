"""
Optimization configurations for PEGASUS summarization service
Includes model parameters, chunking settings, and performance tuning
"""

import os
from typing import Dict, Any
from dataclasses import dataclass

@dataclass
class ModelConfig:
    """Configuration for PEGASUS model optimization"""
    model_name: str = "google/pegasus-xsum"
    max_length: int = 128
    min_length: int = 30
    num_beams: int = 4
    length_penalty: float = 2.0
    early_stopping: bool = True
    do_sample: bool = False
    temperature: float = 1.0
    top_k: int = 50
    top_p: float = 1.0
    repetition_penalty: float = 1.0
    no_repeat_ngram_size: int = 3

@dataclass
class ChunkingConfig:
    """Configuration for text chunking optimization"""
    max_chunk_size: int = 800  # Tokens per chunk
    overlap_size: int = 100    # Overlap between chunks
    min_chunk_size: int = 50   # Minimum viable chunk size
    max_chunks: int = 20       # Maximum number of chunks to process
    chunk_separator: str = "\n\n"  # Preferred split points
    
@dataclass
class CacheConfig:
    """Configuration for response caching"""
    max_cache_size: int = 1000  # Maximum number of cached responses
    cache_ttl: int = 3600       # Cache time-to-live in seconds
    enable_cache: bool = True
    cache_key_length: int = 64  # Length of cache key hash

@dataclass
class PerformanceConfig:
    """Configuration for performance optimization"""
    max_concurrent_requests: int = 10
    request_timeout: int = 300  # 5 minutes
    model_device: str = "cpu"   # "cpu" or "cuda"
    torch_threads: int = 4      # Number of PyTorch threads
    enable_half_precision: bool = False  # Use FP16 for faster inference
    batch_processing: bool = False       # Enable batch processing
    max_batch_size: int = 4             # Maximum batch size

class OptimizationManager:
    """Manages optimization settings based on environment and hardware"""
    
    def __init__(self):
        self.model_config = ModelConfig()
        self.chunking_config = ChunkingConfig()
        self.cache_config = CacheConfig()
        self.performance_config = PerformanceConfig()
        
        self._apply_environment_overrides()
        self._optimize_for_hardware()
    
    def _apply_environment_overrides(self):
        """Apply configuration overrides from environment variables"""
        
        # Model configuration
        if os.getenv("MODEL_NAME"):
            self.model_config.model_name = os.getenv("MODEL_NAME")
        
        if os.getenv("MAX_SUMMARY_LENGTH"):
            self.model_config.max_length = int(os.getenv("MAX_SUMMARY_LENGTH"))
        
        if os.getenv("MIN_SUMMARY_LENGTH"):
            self.model_config.min_length = int(os.getenv("MIN_SUMMARY_LENGTH"))
        
        # Chunking configuration
        if os.getenv("MAX_CHUNK_SIZE"):
            self.chunking_config.max_chunk_size = int(os.getenv("MAX_CHUNK_SIZE"))
        
        if os.getenv("CHUNK_OVERLAP"):
            self.chunking_config.overlap_size = int(os.getenv("CHUNK_OVERLAP"))
        
        # Cache configuration
        if os.getenv("CACHE_SIZE"):
            self.cache_config.max_cache_size = int(os.getenv("CACHE_SIZE"))
        
        if os.getenv("CACHE_TTL"):
            self.cache_config.cache_ttl = int(os.getenv("CACHE_TTL"))
        
        if os.getenv("DISABLE_CACHE"):
            self.cache_config.enable_cache = False
        
        # Performance configuration
        if os.getenv("MAX_CONCURRENT_REQUESTS"):
            self.performance_config.max_concurrent_requests = int(os.getenv("MAX_CONCURRENT_REQUESTS"))
        
        if os.getenv("REQUEST_TIMEOUT"):
            self.performance_config.request_timeout = int(os.getenv("REQUEST_TIMEOUT"))
        
        if os.getenv("TORCH_THREADS"):
            self.performance_config.torch_threads = int(os.getenv("TORCH_THREADS"))
    
    def _optimize_for_hardware(self):
        """Optimize settings based on available hardware"""
        import torch
        import psutil
        
        # CPU optimization
        cpu_count = psutil.cpu_count()
        if cpu_count:
            # Use half of available CPU cores for PyTorch
            self.performance_config.torch_threads = min(
                self.performance_config.torch_threads,
                max(1, cpu_count // 2)
            )
        
        # Memory optimization
        memory_gb = psutil.virtual_memory().total / (1024**3)
        if memory_gb < 8:
            # Reduce cache size for low memory systems
            self.cache_config.max_cache_size = min(500, self.cache_config.max_cache_size)
            self.chunking_config.max_chunks = min(10, self.chunking_config.max_chunks)
            self.performance_config.max_concurrent_requests = min(5, self.performance_config.max_concurrent_requests)
        
        # GPU optimization
        if torch.cuda.is_available() and os.getenv("ENABLE_GPU", "false").lower() == "true":
            self.performance_config.model_device = "cuda"
            self.performance_config.enable_half_precision = True
            self.performance_config.batch_processing = True
        
        # Environment-specific optimizations
        environment = os.getenv("ENVIRONMENT", "production")
        if environment == "test":
            self._apply_test_optimizations()
        elif environment == "development":
            self._apply_development_optimizations()
    
    def _apply_test_optimizations(self):
        """Apply optimizations for testing environment"""
        # Faster, less accurate settings for testing
        self.model_config.max_length = 64
        self.model_config.min_length = 20
        self.model_config.num_beams = 2
        self.chunking_config.max_chunk_size = 500
        self.chunking_config.max_chunks = 5
        self.cache_config.max_cache_size = 100
        self.performance_config.max_concurrent_requests = 3
        self.performance_config.request_timeout = 60
    
    def _apply_development_optimizations(self):
        """Apply optimizations for development environment"""
        # Balanced settings for development
        self.model_config.max_length = 96
        self.model_config.min_length = 25
        self.model_config.num_beams = 3
        self.cache_config.max_cache_size = 500
        self.performance_config.max_concurrent_requests = 5
    
    def get_model_kwargs(self) -> Dict[str, Any]:
        """Get model generation parameters"""
        return {
            "max_length": self.model_config.max_length,
            "min_length": self.model_config.min_length,
            "num_beams": self.model_config.num_beams,
            "length_penalty": self.model_config.length_penalty,
            "early_stopping": self.model_config.early_stopping,
            "do_sample": self.model_config.do_sample,
            "temperature": self.model_config.temperature,
            "top_k": self.model_config.top_k,
            "top_p": self.model_config.top_p,
            "repetition_penalty": self.model_config.repetition_penalty,
            "no_repeat_ngram_size": self.model_config.no_repeat_ngram_size,
        }
    
    def get_chunking_params(self) -> Dict[str, Any]:
        """Get text chunking parameters"""
        return {
            "max_chunk_size": self.chunking_config.max_chunk_size,
            "overlap_size": self.chunking_config.overlap_size,
            "min_chunk_size": self.chunking_config.min_chunk_size,
            "max_chunks": self.chunking_config.max_chunks,
            "chunk_separator": self.chunking_config.chunk_separator,
        }
    
    def get_cache_params(self) -> Dict[str, Any]:
        """Get caching parameters"""
        return {
            "max_cache_size": self.cache_config.max_cache_size,
            "cache_ttl": self.cache_config.cache_ttl,
            "enable_cache": self.cache_config.enable_cache,
            "cache_key_length": self.cache_config.cache_key_length,
        }
    
    def get_performance_params(self) -> Dict[str, Any]:
        """Get performance parameters"""
        return {
            "max_concurrent_requests": self.performance_config.max_concurrent_requests,
            "request_timeout": self.performance_config.request_timeout,
            "model_device": self.performance_config.model_device,
            "torch_threads": self.performance_config.torch_threads,
            "enable_half_precision": self.performance_config.enable_half_precision,
            "batch_processing": self.performance_config.batch_processing,
            "max_batch_size": self.performance_config.max_batch_size,
        }
    
    def print_configuration(self):
        """Print current configuration for debugging"""
        print("=== PEGASUS Optimization Configuration ===")
        print(f"Model: {self.model_config.model_name}")
        print(f"Device: {self.performance_config.model_device}")
        print(f"Max summary length: {self.model_config.max_length}")
        print(f"Max chunk size: {self.chunking_config.max_chunk_size}")
        print(f"Cache size: {self.cache_config.max_cache_size}")
        print(f"Max concurrent requests: {self.performance_config.max_concurrent_requests}")
        print(f"PyTorch threads: {self.performance_config.torch_threads}")
        print("=" * 45)

# Global optimization manager instance
optimization_manager = OptimizationManager()

# Convenience functions for accessing configurations
def get_model_config() -> ModelConfig:
    return optimization_manager.model_config

def get_chunking_config() -> ChunkingConfig:
    return optimization_manager.chunking_config

def get_cache_config() -> CacheConfig:
    return optimization_manager.cache_config

def get_performance_config() -> PerformanceConfig:
    return optimization_manager.performance_config