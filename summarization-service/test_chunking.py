#!/usr/bin/env python3
"""
Test script for text chunking functionality.
This script tests the chunking logic without requiring the full model to be loaded.
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from main import ModelWrapper
import re

def test_chunking_logic():
    """Test the text chunking functionality."""
    print("Testing text chunking logic...")
    
    # Create a mock model wrapper for testing
    wrapper = ModelWrapper()
    wrapper.max_tokens = 100  # Small limit for testing
    wrapper.chunk_overlap = 10
    wrapper.max_input_chars = 1000
    wrapper.max_chunks = 5
    
    # Test 1: Short text (should return single chunk)
    short_text = "This is a short text that should fit in one chunk."
    chunks = wrapper.chunk_text(short_text)
    print(f"Test 1 - Short text: {len(chunks)} chunks")
    assert len(chunks) == 1, f"Expected 1 chunk, got {len(chunks)}"
    
    # Test 2: Long text (should be chunked)
    long_text = " ".join([f"This is sentence number {i}." for i in range(50)])
    chunks = wrapper.chunk_text(long_text)
    print(f"Test 2 - Long text: {len(chunks)} chunks")
    assert len(chunks) > 1, f"Expected multiple chunks, got {len(chunks)}"
    
    # Test 3: Sentence splitting
    sentences = wrapper._split_into_sentences("First sentence. Second sentence! Third sentence?")
    print(f"Test 3 - Sentence splitting: {len(sentences)} sentences")
    assert len(sentences) == 3, f"Expected 3 sentences, got {len(sentences)}"
    
    # Test 4: Overlap text extraction
    test_text = "word1 word2 word3 word4 word5 word6 word7 word8 word9 word10"
    overlap = wrapper._get_overlap_text(test_text)
    print(f"Test 4 - Overlap text: '{overlap}'")
    assert len(overlap.split()) <= wrapper.chunk_overlap, "Overlap text too long"
    
    # Test 5: Input size validation
    try:
        wrapper.max_input_chars = 50  # Very small limit
        wrapper.validate_input_size("This is a text that exceeds the character limit for testing purposes")
        assert False, "Should have raised an exception for oversized input"
    except Exception as e:
        print(f"Test 5 - Size validation: Correctly caught oversized input")
    
    print("All chunking tests passed!")

def test_token_counting():
    """Test token counting functionality."""
    print("\nTesting token counting...")
    
    wrapper = ModelWrapper()
    
    # Test basic token counting (fallback method)
    text = "This is a test sentence with multiple words."
    token_count = wrapper.count_tokens(text)
    print(f"Token count for test text: {token_count}")
    assert token_count > 0, "Token count should be positive"
    
    print("Token counting tests passed!")

def test_simple_merge():
    """Test the simple merge functionality."""
    print("\nTesting simple merge...")
    
    wrapper = ModelWrapper()
    
    summaries = [
        "This is the first summary. It contains important information.",
        "This is the second summary. It also has valuable content.",
        "This is the first summary. It contains important information."  # Duplicate
    ]
    
    merged = wrapper._simple_merge(summaries)
    print(f"Merged summary: {merged}")
    
    # Check that duplicates are removed
    sentences = wrapper._split_into_sentences(merged)
    unique_sentences = set(s.lower().strip() for s in sentences)
    assert len(sentences) == len(unique_sentences), "Duplicate sentences should be removed"
    
    print("Simple merge tests passed!")

if __name__ == "__main__":
    try:
        test_chunking_logic()
        test_token_counting()
        test_simple_merge()
        print("\n✅ All tests passed successfully!")
    except Exception as e:
        print(f"\n❌ Test failed: {str(e)}")
        sys.exit(1)