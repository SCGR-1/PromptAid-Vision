#!/usr/bin/env python3
"""
Test script for Hugging Face API integration
Tests different models with the test.jpg file
"""

import asyncio
import aiohttp
import os
from pathlib import Path

# Test models
TEST_MODELS = [
    "nlpconnect/vit-gpt2-image-captioning",
    "Salesforce/blip-image-captioning-base", 
    "llava-hf/llava-1.5-7b-hf"
]

async def test_hf_model(model_id: str, api_key: str, image_path: str):
    """Test a specific Hugging Face model"""
    print(f"\n{'='*60}")
    print(f"Testing model: {model_id}")
    print(f"{'='*60}")
    
    # Read the test image
    with open(image_path, 'rb') as f:
        image_bytes = f.read()
    
    print(f"Image size: {len(image_bytes)} bytes")
    
    # Test both API endpoints
    endpoints = [
        f"https://api-inference.huggingface.co/models/{model_id}?task=image-to-text",
        f"https://api-inference.huggingface.co/pipeline/image-to-text?model={model_id}"
    ]
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/octet-stream",
    }
    
    for i, url in enumerate(endpoints, 1):
        print(f"\n--- Testing endpoint {i}: {url} ---")
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    url,
                    headers=headers,
                    data=image_bytes,
                    timeout=aiohttp.ClientTimeout(total=60),
                ) as resp:
                    print(f"Response status: {resp.status}")
                    
                    if resp.status == 200:
                        result = await resp.json()
                        print(f"✅ Success! Response: {result}")
                        
                        # Extract caption
                        if isinstance(result, list) and len(result) > 0:
                            caption = result[0].get("generated_text", "")
                            print(f"📝 Caption: {caption}")
                        else:
                            print(f"⚠️  Unexpected response format: {result}")
                    else:
                        text = await resp.text()
                        print(f"❌ Error {resp.status}: {text}")
                        
        except Exception as e:
            print(f"❌ Exception: {str(e)}")

async def main():
    """Main test function"""
    print("🧪 Hugging Face API Test")
    print("=" * 60)
    
    # Get API key from environment
    api_key = os.getenv('HF_API_KEY')
    if not api_key:
        print("❌ HF_API_KEY environment variable not set!")
        print("Please set your Hugging Face API key:")
        print("export HF_API_KEY=your_api_key_here")
        return
    
    print(f"✅ API Key found: {api_key[:10]}...")
    
    # Find test image
    test_image_path = Path("tests/test.jpg")
    if not test_image_path.exists():
        print(f"❌ Test image not found at: {test_image_path}")
        print("Please ensure test.jpg exists in the tests folder")
        return
    
    print(f"✅ Test image found: {test_image_path}")
    
    # Test each model
    for model_id in TEST_MODELS:
        await test_hf_model(model_id, api_key, str(test_image_path))
    
    print(f"\n{'='*60}")
    print("🏁 Test completed!")
    print(f"{'='*60}")

if __name__ == "__main__":
    asyncio.run(main()) 