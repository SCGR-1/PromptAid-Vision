#!/usr/bin/env python3
"""
Debug script to diagnose Hugging Face model registration issues.
Run this script to check API key validity and model availability.
"""

import os
import sys
import asyncio
import aiohttp
import json
from typing import Dict, Any

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.config import settings
from app.database import SessionLocal
from app import crud

async def test_hf_api_key(api_key: str) -> Dict[str, Any]:
    """Test if the Hugging Face API key is valid"""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    
    # Test with a simple model list request
    test_url = "https://api-inference.huggingface.co/models"
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(test_url, headers=headers, timeout=30) as resp:
                if resp.status == 200:
                    return {"valid": True, "message": "API key is valid"}
                elif resp.status == 401:
                    return {"valid": False, "message": "API key is invalid or expired"}
                else:
                    return {"valid": False, "message": f"API test failed with status {resp.status}"}
    except Exception as e:
        return {"valid": False, "message": f"API test failed: {str(e)}"}

async def test_model_availability(api_key: str, model_id: str) -> Dict[str, Any]:
    """Test if a specific model is available"""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    
    # Test with a simple text generation request
    test_url = f"https://api-inference.huggingface.co/models/{model_id}"
    payload = {
        "inputs": "Hello, how are you?",
        "parameters": {"max_new_tokens": 10}
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(test_url, headers=headers, json=payload, timeout=30) as resp:
                if resp.status == 200:
                    return {"available": True, "message": "Model is available"}
                elif resp.status == 404:
                    return {"available": False, "message": "Model not found"}
                elif resp.status == 503:
                    return {"available": False, "message": "Model is loading or unavailable"}
                else:
                    return {"available": False, "message": f"Model test failed with status {resp.status}"}
    except Exception as e:
        return {"available": False, "message": f"Model test failed: {str(e)}"}

async def main():
    """Main diagnostic function"""
    print("🔍 Hugging Face Model Diagnostic Tool")
    print("=" * 50)
    
    # Check if API key is set
    if not settings.HF_API_KEY:
        print("❌ HF_API_KEY is not set in environment variables")
        print("   Please set HF_API_KEY to your Hugging Face API token")
        return
    
    print(f"✅ HF_API_KEY is set (length: {len(settings.HF_API_KEY)})")
    
    # Test API key validity
    print("\n🔑 Testing API key validity...")
    api_test = await test_hf_api_key(settings.HF_API_KEY)
    if api_test["valid"]:
        print(f"✅ {api_test['message']}")
    else:
        print(f"❌ {api_test['message']}")
        print("   Please check your Hugging Face API token at https://huggingface.co/settings/tokens")
        return
    
    # Get models from database
    print("\n📋 Checking models in database...")
    db = SessionLocal()
    try:
        models = crud.get_models(db)
        hf_models = [m for m in models if m.provider == "huggingface" and m.model_id]
        
        if not hf_models:
            print("⚠️ No Hugging Face models found in database")
            return
        
        print(f"✅ Found {len(hf_models)} Hugging Face models in database:")
        for model in hf_models:
            print(f"   - {model.m_code}: {model.model_id}")
        
        # Test each model
        print("\n🧪 Testing model availability...")
        for model in hf_models:
            print(f"\nTesting {model.m_code} ({model.model_id})...")
            model_test = await test_model_availability(settings.HF_API_KEY, model.model_id)
            
            if model_test["available"]:
                print(f"   ✅ {model_test['message']}")
            else:
                print(f"   ❌ {model_test['message']}")
                
    finally:
        db.close()
    
    print("\n" + "=" * 50)
    print("💡 Troubleshooting Tips:")
    print("1. Check your Hugging Face API token at https://huggingface.co/settings/tokens")
    print("2. Ensure your token has 'read' permissions")
    print("3. Some models may require special access or may be temporarily unavailable")
    print("4. Check model availability at https://huggingface.co/models")
    print("5. Network issues can cause connection failures")

if __name__ == "__main__":
    asyncio.run(main())
