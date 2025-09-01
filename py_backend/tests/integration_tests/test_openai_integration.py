#!/usr/bin/env python3
"""
Test script for OpenAI GPT-4 Vision integration
Tests the GPT4V service with the test.jpg file
"""

import asyncio
import os
import pytest
from pathlib import Path
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.services.gpt4v_service import GPT4VService
from app.config import settings

@pytest.mark.asyncio
async def test_gpt4v_service():
    """Test the GPT4V service"""
    print("🧪 OpenAI GPT-4 Vision Integration Test")
    print("=" * 60)
    
    if not settings.OPENAI_API_KEY:
        print("❌ OPENAI_API_KEY environment variable not set!")
        print("Please set your OpenAI API key in .env:")
        print("OPENAI_API_KEY=your_api_key_here")
        # Skip test if no API key
        assert True, "Skipping test - no OpenAI API key"
        return
    
    print(f"✅ OpenAI API Key found: {settings.OPENAI_API_KEY[:10]}...")
    
    test_image_path = Path("tests/test.jpg")
    if not test_image_path.exists():
        print(f"❌ Test image not found at: {test_image_path}")
        print("Please ensure test.jpg exists in the tests folder")
        # Skip test if no test image
        assert True, "Skipping test - no test image"
        return
    
    print(f"✅ Test image found: {test_image_path}")
    
    try:
        gpt4v_service = GPT4VService(settings.OPENAI_API_KEY)
        print(f"✅ GPT4V service initialized: {gpt4v_service.model_name}")
    except Exception as e:
        print(f"❌ Failed to initialize GPT4V service: {e}")
        assert False, f"Failed to initialize GPT4V service: {e}"
    
    with open(test_image_path, 'rb') as f:
        image_bytes = f.read()
    
    print(f"📸 Image size: {len(image_bytes)} bytes")
    
    prompt = "Analyze this crisis map and provide a detailed description of the emergency situation, affected areas, and key information shown in the map."
    
    print(f"\n🎯 Testing with prompt: {prompt}")
    print("-" * 60)
    
    try:
        result = await gpt4v_service.generate_caption(image_bytes, prompt)
        
        print("✅ Success! GPT-4 Vision response:")
        print(f"📝 Caption: {result['caption']}")
        print(f"🎯 Confidence: {result['confidence']}")
        print(f"⏱️  Processing time: {result['processing_time']}")
        
        if result.get('raw_response'):
            print(f"🔧 Raw response: {result['raw_response']}")
        
        assert result['caption'], "Should have generated a caption"
        assert result['confidence'] >= 0, "Confidence should be non-negative"
            
    except Exception as e:
        print(f"❌ Error generating caption: {e}")
        import traceback
        traceback.print_exc()
        assert False, f"Error generating caption: {e}"
    
    print(f"\n{'='*60}")
    print("🏁 Test completed!")
    print(f"{'='*60}")

if __name__ == "__main__":
    asyncio.run(test_gpt4v_service()) 