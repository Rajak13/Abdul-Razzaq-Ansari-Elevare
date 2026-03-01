#!/usr/bin/env python3
"""
Pre-download PEGASUS model for faster startup.
Run this once before starting the service for the first time.
"""

import sys
from transformers import PegasusTokenizer, PegasusForConditionalGeneration

MODEL_NAME = "google/pegasus-arxiv"

def download_model():
    """Download and cache the PEGASUS model"""
    print(f"Downloading {MODEL_NAME}...")
    print("This is a one-time download (~2GB). Please wait...")
    
    try:
        print("\n[1/2] Downloading tokenizer...")
        tokenizer = PegasusTokenizer.from_pretrained(MODEL_NAME)
        print("✓ Tokenizer downloaded successfully")
        
        print("\n[2/2] Downloading model (this may take several minutes)...")
        model = PegasusForConditionalGeneration.from_pretrained(MODEL_NAME)
        print("✓ Model downloaded successfully")
        
        print(f"\n✅ {MODEL_NAME} is ready!")
        print("You can now start the summarization service.")
        return 0
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Download interrupted. Run this script again to resume.")
        return 1
    except Exception as e:
        print(f"\n❌ Error downloading model: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(download_model())
