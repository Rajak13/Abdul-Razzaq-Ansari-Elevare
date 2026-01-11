#!/usr/bin/env python3
"""
Basic functionality test for PEGASUS Summarization Service

This script tests the basic functionality without loading the full model
to verify the implementation is correct.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import sys
import os

# Add the app directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.main import app, model_wrapper

client = TestClient(app)

def test_health_endpoint():
    """Test the health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "service" in data
    assert "version" in data
    assert "model_loaded" in data
    print("✅ Health endpoint test passed")

def test_model_info_endpoint():
    """Test the model info endpoint"""
    response = client.get("/model-info")
    assert response.status_code == 200
    data = response.json()
    assert "model_name" in data
    assert "device" in data
    assert "max_tokens" in data
    assert "is_loaded" in data
    print("✅ Model info endpoint test passed")

def test_root_endpoint():
    """Test the root endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "endpoints" in data
    assert "model-info" in data["endpoints"]
    print("✅ Root endpoint test passed")

@patch.object(model_wrapper, 'check_model_ready')
@patch.object(model_wrapper, 'tokenizer')
@patch.object(model_wrapper, 'model')
def test_summarize_endpoint_validation(mock_model, mock_tokenizer, mock_check):
    """Test the summarize endpoint input validation"""
    
    # Test empty text
    response = client.post("/summarize", json={"text": ""})
    assert response.status_code == 400
    response_data = response.json()
    print(f"Empty text response: {response_data}")
    # Check if it's the new structured format or old format
    if isinstance(response_data, dict) and "error" in response_data:
        assert "empty" in response_data["error"].lower()
    else:
        assert "empty" in str(response_data).lower()
    
    # Test missing text
    response = client.post("/summarize", json={})
    assert response.status_code == 422  # Pydantic validation error
    
    print("✅ Summarize endpoint validation test passed")

def test_model_wrapper_initialization():
    """Test ModelWrapper initialization"""
    assert model_wrapper.model_name == "google/pegasus-xsum"
    assert model_wrapper.max_tokens == 1024
    assert model_wrapper.chunk_overlap == 50
    assert hasattr(model_wrapper, 'device')
    print("✅ ModelWrapper initialization test passed")

def test_cache_endpoints():
    """Test cache management endpoints"""
    
    # Test cache stats
    response = client.get("/cache/stats")
    assert response.status_code == 200
    data = response.json()
    assert "cache_stats" in data
    assert "cache_enabled" in data
    assert data["cache_enabled"] is True
    
    # Test cache clear
    response = client.post("/cache/clear")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "cleared" in data["message"].lower()
    
    # Test cache cleanup
    response = client.post("/cache/cleanup")
    assert response.status_code == 200
    data = response.json()
    assert "entries_removed" in data
    
    print("✅ Cache endpoints test passed")

def test_system_endpoints():
    """Test system monitoring endpoints"""
    
    # Test system resources
    response = client.get("/system/resources")
    assert response.status_code == 200
    data = response.json()
    assert "resources" in data
    assert "timestamp" in data
    
    # Test detailed health check
    response = client.get("/system/health-detailed")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "model_loaded" in data
    assert "system_resources" in data
    
    print("✅ System endpoints test passed")

if __name__ == "__main__":
    print("Running basic functionality tests...")
    print("=" * 50)
    
    try:
        test_health_endpoint()
        test_model_info_endpoint()
        test_root_endpoint()
        test_summarize_endpoint_validation()
        test_model_wrapper_initialization()
        test_cache_endpoints()
        test_system_endpoints()
        
        print("=" * 50)
        print("🎉 All basic functionality tests passed!")
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        sys.exit(1)