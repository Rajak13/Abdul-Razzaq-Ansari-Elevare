#!/usr/bin/env python3
"""
Test script for PEGASUS Summarization Service

This script tests the basic functionality of the FastAPI service
to ensure all endpoints are working correctly.
"""

import requests
import json
import sys

def test_health_endpoint():
    """Test the health check endpoint"""
    try:
        response = requests.get("http://localhost:8001/health")
        if response.status_code == 200:
            data = response.json()
            print("✅ Health check passed:")
            print(f"   Status: {data['status']}")
            print(f"   Service: {data['service']}")
            print(f"   Version: {data['version']}")
            return True
        else:
            print(f"❌ Health check failed with status code: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check failed with error: {e}")
        return False

def test_root_endpoint():
    """Test the root endpoint"""
    try:
        response = requests.get("http://localhost:8001/")
        if response.status_code == 200:
            data = response.json()
            print("✅ Root endpoint passed:")
            print(f"   Message: {data['message']}")
            print(f"   Available endpoints: {data['endpoints']}")
            return True
        else:
            print(f"❌ Root endpoint failed with status code: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Root endpoint failed with error: {e}")
        return False

def test_summarize_endpoint():
    """Test the summarize endpoint (placeholder implementation)"""
    try:
        test_data = {
            "text": "This is a test text for the summarization service. It should return a placeholder response until the PEGASUS model is integrated in task 2.",
            "max_length": 100,
            "min_length": 30
        }
        
        response = requests.post(
            "http://localhost:8001/summarize",
            headers={"Content-Type": "application/json"},
            data=json.dumps(test_data)
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Summarize endpoint passed:")
            print(f"   Summary: {data['summary']}")
            print(f"   Processing time: {data['processing_time']}")
            print(f"   Chunks processed: {data['chunks_processed']}")
            print(f"   Model: {data['model']}")
            return True
        else:
            print(f"❌ Summarize endpoint failed with status code: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Summarize endpoint failed with error: {e}")
        return False

def main():
    """Run all tests"""
    print("Testing PEGASUS Summarization Service...")
    print("=" * 50)
    
    tests = [
        test_health_endpoint,
        test_root_endpoint,
        test_summarize_endpoint
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
        print()
    
    print("=" * 50)
    print(f"Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! The service is working correctly.")
        sys.exit(0)
    else:
        print("⚠️  Some tests failed. Please check the service.")
        sys.exit(1)

if __name__ == "__main__":
    main()