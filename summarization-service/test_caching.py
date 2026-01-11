#!/usr/bin/env python3
"""
Test caching functionality for PEGASUS Summarization Service
"""

import pytest
import sys
import os
import time

# Add the app directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.main import SummaryCache

def test_cache_basic_functionality():
    """Test basic cache operations"""
    cache = SummaryCache(max_size=3, ttl_seconds=2)
    
    # Test cache miss
    result = cache.get("test text", 150, 50)
    assert result is None
    
    # Test cache put and get
    test_result = {"summary": "test summary", "processing_time": 1.0}
    cache.put("test text", 150, 50, test_result)
    
    cached_result = cache.get("test text", 150, 50)
    assert cached_result == test_result
    
    print("✅ Basic cache functionality test passed")

def test_cache_key_generation():
    """Test cache key generation with different parameters"""
    cache = SummaryCache(max_size=5, ttl_seconds=10)
    
    # Same text, different parameters should be different cache entries
    cache.put("test text", 150, 50, {"summary": "summary1"})
    cache.put("test text", 200, 50, {"summary": "summary2"})
    cache.put("test text", 150, 30, {"summary": "summary3"})
    
    result1 = cache.get("test text", 150, 50)
    result2 = cache.get("test text", 200, 50)
    result3 = cache.get("test text", 150, 30)
    
    assert result1["summary"] == "summary1"
    assert result2["summary"] == "summary2"
    assert result3["summary"] == "summary3"
    
    print("✅ Cache key generation test passed")

def test_cache_lru_eviction():
    """Test LRU eviction policy"""
    cache = SummaryCache(max_size=2, ttl_seconds=10)
    
    # Fill cache to capacity
    cache.put("text1", 150, 50, {"summary": "summary1"})
    cache.put("text2", 150, 50, {"summary": "summary2"})
    
    # Both should be in cache
    assert cache.get("text1", 150, 50) is not None
    assert cache.get("text2", 150, 50) is not None
    
    # Add third item, should evict first
    cache.put("text3", 150, 50, {"summary": "summary3"})
    
    # First should be evicted, others should remain
    assert cache.get("text1", 150, 50) is None
    assert cache.get("text2", 150, 50) is not None
    assert cache.get("text3", 150, 50) is not None
    
    print("✅ Cache LRU eviction test passed")

def test_cache_ttl_expiration():
    """Test TTL expiration"""
    cache = SummaryCache(max_size=5, ttl_seconds=1)  # 1 second TTL
    
    # Add item to cache
    cache.put("test text", 150, 50, {"summary": "test summary"})
    
    # Should be available immediately
    result = cache.get("test text", 150, 50)
    assert result is not None
    
    # Wait for expiration
    time.sleep(1.1)
    
    # Should be expired now
    result = cache.get("test text", 150, 50)
    assert result is None
    
    print("✅ Cache TTL expiration test passed")

def test_cache_stats():
    """Test cache statistics"""
    cache = SummaryCache(max_size=3, ttl_seconds=10)
    
    # Initial stats
    stats = cache.get_stats()
    assert stats["current_size"] == 0
    assert stats["max_size"] == 3
    assert stats["utilization"] == 0.0
    
    # Add some items
    cache.put("text1", 150, 50, {"summary": "summary1"})
    cache.put("text2", 150, 50, {"summary": "summary2"})
    
    stats = cache.get_stats()
    assert stats["current_size"] == 2
    assert stats["utilization"] == 2/3
    
    print("✅ Cache stats test passed")

def test_cache_cleanup():
    """Test cache cleanup of expired entries"""
    cache = SummaryCache(max_size=5, ttl_seconds=1)
    
    # Add items
    cache.put("text1", 150, 50, {"summary": "summary1"})
    cache.put("text2", 150, 50, {"summary": "summary2"})
    
    # Wait for expiration
    time.sleep(1.1)
    
    # Add fresh item
    cache.put("text3", 150, 50, {"summary": "summary3"})
    
    # Cleanup expired entries
    removed_count = cache.cleanup_expired()
    assert removed_count == 2  # Two expired entries should be removed
    
    # Only fresh item should remain
    assert cache.get("text1", 150, 50) is None
    assert cache.get("text2", 150, 50) is None
    assert cache.get("text3", 150, 50) is not None
    
    print("✅ Cache cleanup test passed")

def test_cache_thread_safety():
    """Test basic thread safety (simplified test)"""
    cache = SummaryCache(max_size=10, ttl_seconds=10)
    
    # Test concurrent access (simplified - just ensure no exceptions)
    import threading
    
    def worker(thread_id):
        for i in range(10):
            cache.put(f"text_{thread_id}_{i}", 150, 50, {"summary": f"summary_{thread_id}_{i}"})
            result = cache.get(f"text_{thread_id}_{i}", 150, 50)
            assert result is not None
    
    threads = []
    for i in range(3):
        thread = threading.Thread(target=worker, args=(i,))
        threads.append(thread)
        thread.start()
    
    for thread in threads:
        thread.join()
    
    print("✅ Cache thread safety test passed")

if __name__ == "__main__":
    print("Running caching functionality tests...")
    print("=" * 50)
    
    try:
        test_cache_basic_functionality()
        test_cache_key_generation()
        test_cache_lru_eviction()
        test_cache_ttl_expiration()
        test_cache_stats()
        test_cache_cleanup()
        test_cache_thread_safety()
        
        print("=" * 50)
        print("🎉 All caching tests passed!")
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)