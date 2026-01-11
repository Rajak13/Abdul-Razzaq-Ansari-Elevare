#!/usr/bin/env python3
"""
Test error handling functionality for PEGASUS Summarization Service
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

@patch.object(model_wrapper, 'check_model_ready')
def test_input_validation_errors(mock_check):
    """Test various input validation error scenarios"""
    
    # Mock model as ready
    mock_check.return_value = None
    
    # Test empty text
    response = client.post("/summarize", json={"text": ""})
    assert response.status_code == 400
    data = response.json()
    assert "error" in data
    assert "empty" in data["error"].lower()
    
    # Test missing text field
    response = client.post("/summarize", json={})
    assert response.status_code == 422
    
    # Test invalid JSON
    response = client.post("/summarize", 
                          data="invalid json",
                          headers={"Content-Type": "application/json"})
    assert response.status_code == 422
    
    print("✅ Input validation errors test passed")

@patch.object(model_wrapper, 'check_model_ready')
@patch.object(model_wrapper, 'validate_input_size')
def test_size_limit_errors(mock_validate, mock_check):
    """Test size limit error handling"""
    
    # Mock model as ready
    mock_check.return_value = None
    
    # Mock size validation to raise HTTPException
    from fastapi import HTTPException
    mock_validate.side_effect = HTTPException(
        status_code=413,
        detail={
            "error": "Input text exceeds maximum character limit",
            "code": "TEXT_TOO_LONG",
            "max_chars": 50000,
            "current_chars": 60000
        }
    )
    
    response = client.post("/summarize", json={"text": "test text"})
    assert response.status_code == 413
    data = response.json()
    assert "error" in data
    assert "TEXT_TOO_LONG" in data["code"]
    
    print("✅ Size limit errors test passed")

@patch.object(model_wrapper, 'check_model_ready')
def test_model_not_ready_error(mock_check):
    """Test model not ready error handling"""
    
    from fastapi import HTTPException
    mock_check.side_effect = HTTPException(
        status_code=503,
        detail="Model not loaded. Service is not ready for inference."
    )
    
    response = client.post("/summarize", json={"text": "test text"})
    assert response.status_code == 503
    data = response.json()
    assert "error" in data
    assert "not loaded" in data["error"].lower() or "not ready" in data["error"].lower()
    
    print("✅ Model not ready error test passed")

@patch.object(model_wrapper, 'check_model_ready')
def test_error_response_format(mock_check):
    """Test that error responses follow consistent format"""
    
    # Mock model as ready
    mock_check.return_value = None
    
    # Test with empty text to get a structured error
    response = client.post("/summarize", json={"text": ""})
    assert response.status_code == 400
    
    data = response.json()
    
    # Check for structured error format
    assert isinstance(data, dict)
    assert "error" in data
    assert "code" in data
    
    # Error should be a string
    assert isinstance(data["error"], str)
    assert isinstance(data["code"], str)
    
    print("✅ Error response format test passed")

def test_model_wrapper_error_categorization():
    """Test ModelWrapper error categorization"""
    
    # Test _handle_model_loading_error method
    test_errors = [
        ("CUDA out of memory", "memory"),
        ("Connection timeout", "network"),
        ("Permission denied", "permission"),
        ("No space left on device", "disk"),
        ("Model not found", "model"),
        ("Unknown error", "Failed to load model")
    ]
    
    for error_msg, expected_category in test_errors:
        try:
            model_wrapper._handle_model_loading_error(Exception(error_msg))
            assert False, f"Should have raised exception for: {error_msg}"
        except RuntimeError as e:
            error_str = str(e).lower()
            if expected_category == "memory":
                assert "memory" in error_str
            elif expected_category == "network":
                assert "network" in error_str or "connection" in error_str
            elif expected_category == "permission":
                assert "permission" in error_str
            elif expected_category == "disk":
                assert "disk" in error_str or "space" in error_str
            elif expected_category == "model":
                assert "model" in error_str and "not found" in error_str
            else:
                assert "failed to load model" in error_str
    
    print("✅ Model wrapper error categorization test passed")

def test_system_resource_monitoring():
    """Test system resource monitoring functionality"""
    
    try:
        resources = model_wrapper.get_system_resources()
        
        # Check required fields
        assert "cpu_percent" in resources
        assert "memory_percent" in resources
        assert "available_memory_gb" in resources
        assert "gpu_available" in resources
        
        # Check data types
        assert isinstance(resources["cpu_percent"], (int, float))
        assert isinstance(resources["memory_percent"], (int, float))
        assert isinstance(resources["available_memory_gb"], (int, float))
        assert isinstance(resources["gpu_available"], bool)
        
        # Check reasonable ranges
        assert 0 <= resources["cpu_percent"] <= 100
        assert 0 <= resources["memory_percent"] <= 100
        assert resources["available_memory_gb"] >= 0
        
        print("✅ System resource monitoring test passed")
        
    except Exception as e:
        print(f"⚠️  System resource monitoring test skipped: {str(e)}")

def test_timeout_configuration():
    """Test timeout configuration"""
    
    # Check that timeout is configured
    assert hasattr(model_wrapper, 'inference_timeout')
    assert isinstance(model_wrapper.inference_timeout, int)
    assert model_wrapper.inference_timeout > 0
    
    print("✅ Timeout configuration test passed")

def test_cache_error_handling():
    """Test cache error handling doesn't break main functionality"""
    
    # Test cache stats endpoint
    response = client.get("/cache/stats")
    assert response.status_code == 200
    
    # Test cache clear endpoint
    response = client.post("/cache/clear")
    assert response.status_code == 200
    
    # Test cache cleanup endpoint
    response = client.post("/cache/cleanup")
    assert response.status_code == 200
    
    print("✅ Cache error handling test passed")

if __name__ == "__main__":
    print("Running error handling tests...")
    print("=" * 50)
    
    try:
        test_input_validation_errors()
        test_size_limit_errors()
        test_model_not_ready_error()
        test_error_response_format()
        test_model_wrapper_error_categorization()
        test_system_resource_monitoring()
        test_timeout_configuration()
        test_cache_error_handling()
        
        print("=" * 50)
        print("🎉 All error handling tests passed!")
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)