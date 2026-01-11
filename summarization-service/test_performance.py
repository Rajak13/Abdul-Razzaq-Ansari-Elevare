"""
Performance tests for PEGASUS summarization service
Tests various text sizes, caching effectiveness, and memory usage
"""

import asyncio
import time
import psutil
import pytest
import httpx
from concurrent.futures import ThreadPoolExecutor
from typing import List, Dict, Any

# Test data with various sizes
TEST_TEXTS = {
    "short": "React hooks are functions that let you use state and other React features without writing a class.",
    "medium": """Machine learning has revolutionized the field of artificial intelligence by enabling computers to learn patterns from data without explicit programming. Deep learning, a subset of machine learning, uses neural networks with multiple layers to model and understand complex patterns in data. Convolutional Neural Networks (CNNs) have been particularly successful in image recognition tasks, achieving human-level performance in many domains.""",
    "long": """The field of quantum computing represents one of the most significant technological frontiers of the 21st century. Unlike classical computers that use bits to represent information as either 0 or 1, quantum computers use quantum bits or qubits that can exist in a superposition of both states simultaneously. This fundamental difference allows quantum computers to process vast amounts of information in parallel, potentially solving certain problems exponentially faster than classical computers. The concept of quantum superposition is just one of the quantum mechanical phenomena that quantum computers exploit. Another crucial principle is quantum entanglement, where qubits become correlated in such a way that the quantum state of each qubit cannot be described independently.""" * 5,
    "extra_long": """Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.""" * 50
}

BASE_URL = "http://localhost:8001"

class PerformanceMonitor:
    """Monitor system performance during tests"""
    
    def __init__(self):
        self.process = psutil.Process()
        self.initial_memory = self.process.memory_info().rss
        self.peak_memory = self.initial_memory
        
    def update_peak_memory(self):
        current_memory = self.process.memory_info().rss
        self.peak_memory = max(self.peak_memory, current_memory)
        
    def get_memory_usage_mb(self):
        return self.process.memory_info().rss / 1024 / 1024
        
    def get_memory_increase_mb(self):
        return (self.peak_memory - self.initial_memory) / 1024 / 1024

@pytest.fixture
def performance_monitor():
    return PerformanceMonitor()

@pytest.fixture
async def client():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=60.0) as client:
        yield client

@pytest.mark.asyncio
async def test_summarization_performance_by_text_size(client: httpx.AsyncClient, performance_monitor: PerformanceMonitor):
    """Test summarization performance with various text sizes"""
    
    results = {}
    
    for size_name, text in TEST_TEXTS.items():
        performance_monitor.update_peak_memory()
        
        start_time = time.time()
        
        response = await client.post("/summarize", json={"text": text})
        
        end_time = time.time()
        duration = end_time - start_time
        
        performance_monitor.update_peak_memory()
        
        assert response.status_code == 200
        data = response.json()
        assert "summary" in data
        assert len(data["summary"]) > 0
        
        results[size_name] = {
            "duration": duration,
            "text_length": len(text),
            "summary_length": len(data["summary"]),
            "chunks_processed": data.get("chunks_processed", 1),
            "memory_mb": performance_monitor.get_memory_usage_mb()
        }
        
        print(f"\n{size_name.upper()} TEXT PERFORMANCE:")
        print(f"  Text length: {len(text)} characters")
        print(f"  Duration: {duration:.2f} seconds")
        print(f"  Summary length: {len(data['summary'])} characters")
        print(f"  Chunks processed: {data.get('chunks_processed', 1)}")
        print(f"  Memory usage: {performance_monitor.get_memory_usage_mb():.1f} MB")
    
    # Performance assertions
    assert results["short"]["duration"] < 10.0, "Short text should be processed quickly"
    assert results["medium"]["duration"] < 15.0, "Medium text should be processed reasonably fast"
    assert results["long"]["duration"] < 30.0, "Long text should be processed within 30 seconds"
    assert results["extra_long"]["duration"] < 60.0, "Extra long text should be processed within 60 seconds"
    
    # Memory usage should not grow excessively
    memory_increase = performance_monitor.get_memory_increase_mb()
    assert memory_increase < 500, f"Memory increase should be less than 500MB, got {memory_increase:.1f}MB"

@pytest.mark.asyncio
async def test_caching_effectiveness(client: httpx.AsyncClient):
    """Test that caching improves performance for identical requests"""
    
    text = TEST_TEXTS["medium"]
    
    # First request (cache miss)
    start_time = time.time()
    response1 = await client.post("/summarize", json={"text": text})
    first_duration = time.time() - start_time
    
    assert response1.status_code == 200
    first_summary = response1.json()["summary"]
    
    # Second request (cache hit)
    start_time = time.time()
    response2 = await client.post("/summarize", json={"text": text})
    second_duration = time.time() - start_time
    
    assert response2.status_code == 200
    second_summary = response2.json()["summary"]
    
    # Verify same result
    assert first_summary == second_summary
    
    # Cache hit should be significantly faster
    assert second_duration < first_duration * 0.5, f"Cached request should be faster: {second_duration:.2f}s vs {first_duration:.2f}s"
    
    print(f"\nCACHING EFFECTIVENESS:")
    print(f"  First request: {first_duration:.2f} seconds")
    print(f"  Second request: {second_duration:.2f} seconds")
    print(f"  Speedup: {first_duration / second_duration:.1f}x")

@pytest.mark.asyncio
async def test_concurrent_requests_performance(client: httpx.AsyncClient):
    """Test performance under concurrent load"""
    
    async def make_request(text: str, request_id: int):
        start_time = time.time()
        response = await client.post("/summarize", json={"text": text, "request_id": request_id})
        duration = time.time() - start_time
        
        assert response.status_code == 200
        data = response.json()
        assert "summary" in data
        
        return {
            "request_id": request_id,
            "duration": duration,
            "summary_length": len(data["summary"])
        }
    
    # Test with 5 concurrent requests
    concurrent_requests = 5
    text = TEST_TEXTS["medium"]
    
    start_time = time.time()
    
    tasks = [make_request(text, i) for i in range(concurrent_requests)]
    results = await asyncio.gather(*tasks)
    
    total_time = time.time() - start_time
    
    # Analyze results
    durations = [r["duration"] for r in results]
    avg_duration = sum(durations) / len(durations)
    max_duration = max(durations)
    min_duration = min(durations)
    
    print(f"\nCONCURRENT REQUESTS PERFORMANCE:")
    print(f"  Concurrent requests: {concurrent_requests}")
    print(f"  Total time: {total_time:.2f} seconds")
    print(f"  Average duration: {avg_duration:.2f} seconds")
    print(f"  Min duration: {min_duration:.2f} seconds")
    print(f"  Max duration: {max_duration:.2f} seconds")
    
    # Performance assertions
    assert max_duration < 30.0, "No request should take more than 30 seconds"
    assert total_time < 60.0, "All concurrent requests should complete within 60 seconds"

@pytest.mark.asyncio
async def test_chunking_performance(client: httpx.AsyncClient, performance_monitor: PerformanceMonitor):
    """Test performance of text chunking with very long content"""
    
    # Create extremely long text that will require chunking
    long_text = TEST_TEXTS["extra_long"]
    
    performance_monitor.update_peak_memory()
    start_time = time.time()
    
    response = await client.post("/summarize", json={"text": long_text})
    
    duration = time.time() - start_time
    performance_monitor.update_peak_memory()
    
    assert response.status_code == 200
    data = response.json()
    
    assert "summary" in data
    assert len(data["summary"]) > 0
    assert data.get("chunks_processed", 1) > 1, "Long text should be chunked"
    
    print(f"\nCHUNKING PERFORMANCE:")
    print(f"  Text length: {len(long_text)} characters")
    print(f"  Chunks processed: {data.get('chunks_processed', 1)}")
    print(f"  Duration: {duration:.2f} seconds")
    print(f"  Summary length: {len(data['summary'])} characters")
    print(f"  Memory usage: {performance_monitor.get_memory_usage_mb():.1f} MB")
    
    # Performance assertions for chunking
    assert duration < 120.0, "Chunked processing should complete within 2 minutes"
    assert len(data["summary"]) > 100, "Chunked summary should be substantial"

@pytest.mark.asyncio
async def test_memory_usage_stability(client: httpx.AsyncClient):
    """Test that memory usage remains stable over multiple requests"""
    
    initial_memory = psutil.Process().memory_info().rss / 1024 / 1024
    memory_readings = [initial_memory]
    
    # Make multiple requests and monitor memory
    for i in range(10):
        text = TEST_TEXTS["medium"] + f" Request {i}"  # Vary text slightly
        response = await client.post("/summarize", json={"text": text})
        assert response.status_code == 200
        
        current_memory = psutil.Process().memory_info().rss / 1024 / 1024
        memory_readings.append(current_memory)
        
        # Small delay to allow garbage collection
        await asyncio.sleep(0.1)
    
    final_memory = memory_readings[-1]
    max_memory = max(memory_readings)
    memory_growth = final_memory - initial_memory
    
    print(f"\nMEMORY STABILITY:")
    print(f"  Initial memory: {initial_memory:.1f} MB")
    print(f"  Final memory: {final_memory:.1f} MB")
    print(f"  Peak memory: {max_memory:.1f} MB")
    print(f"  Memory growth: {memory_growth:.1f} MB")
    
    # Memory should not grow excessively
    assert memory_growth < 100, f"Memory growth should be less than 100MB, got {memory_growth:.1f}MB"
    assert max_memory < initial_memory + 200, "Peak memory should not exceed initial + 200MB"

@pytest.mark.asyncio
async def test_error_handling_performance(client: httpx.AsyncClient):
    """Test that error handling doesn't impact performance"""
    
    error_cases = [
        {"text": ""},  # Empty text
        {"text": "x" * 100000},  # Text too long
        {"invalid": "data"},  # Invalid request format
    ]
    
    for i, case in enumerate(error_cases):
        start_time = time.time()
        response = await client.post("/summarize", json=case)
        duration = time.time() - start_time
        
        # Should respond quickly even for errors
        assert duration < 5.0, f"Error case {i} should respond quickly, took {duration:.2f}s"
        
        # Should return appropriate error status
        assert response.status_code in [400, 413, 422], f"Should return error status for case {i}"
        
        print(f"Error case {i}: {duration:.3f}s - Status {response.status_code}")

if __name__ == "__main__":
    # Run performance tests
    pytest.main([__file__, "-v", "-s"])