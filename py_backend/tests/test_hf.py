#!/usr/bin/env python3
"""Hugging Face API and service integration tests"""

import asyncio
import os
import aiohttp
import base64
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

async def test_api_key():
    """Test if HF API key is valid"""
    hf_api_key = os.getenv('HF_API_KEY')
    if not hf_api_key:
        print("ERROR: HF_API_KEY not found in environment variables")
        return None
    
    print(f"SUCCESS: HF_API_KEY found: {hf_api_key[:10]}...")
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                "https://huggingface.co/api/whoami",
                headers={"Authorization": f"Bearer {hf_api_key}"}
            ) as resp:
                if resp.status == 200:
                    user_info = await resp.json()
                    print(f"SUCCESS: API key valid! User: {user_info.get('name', 'Unknown')}")
                    return hf_api_key
                else:
                    print(f"ERROR: API key validation failed: {resp.status}")
                    return None
    except Exception as e:
        print(f"ERROR: API key validation exception: {str(e)}")
        return None

async def test_basic_models(api_key):
    """Test basic model accessibility"""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    print("\nTESTING: GPT-2 text generation...")
    try:
        async with aiohttp.ClientSession() as session:
            payload = {
                "inputs": "Hello, this is a test message.",
                "parameters": {"max_new_tokens": 50}
            }
            
            async with session.post(
                "https://api-inference.huggingface.co/models/gpt2",
                headers=headers,
                json=payload,
                timeout=aiohttp.ClientTimeout(total=30)
            ) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    print(f"SUCCESS: GPT-2 test successful")
                elif resp.status == 503:
                    print(f"LOADING: GPT-2 is loading")
                else:
                    print(f"ERROR: GPT-2 test failed: {resp.status}")
    except Exception as e:
        print(f"ERROR: GPT-2 test exception: {str(e)}")
    
    print("\nTESTING: Image captioning pipeline...")
    try:
        async with aiohttp.ClientSession() as session:
            test_image = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
            
            payload = {
                "inputs": test_image,
                "parameters": {"max_new_tokens": 100}
            }
            
            async with session.post(
                "https://api-inference.huggingface.co/pipeline/image-to-text",
                headers=headers,
                json=payload,
                timeout=aiohttp.ClientTimeout(total=30)
            ) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    print(f"SUCCESS: Image captioning test successful")
                elif resp.status == 503:
                    print(f"LOADING: Image captioning service is loading")
                else:
                    print(f"ERROR: Image captioning test failed: {resp.status}")
    except Exception as e:
        print(f"ERROR: Image captioning test exception: {str(e)}")

async def test_vision_models(api_key):
    """Test vision-language models"""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    models = [
        {
            "name": "LLaVA 1.5 7B",
            "model_id": "llava-hf/llava-1.5-7b-hf",
            "endpoint": "https://api-inference.huggingface.co/models/llava-hf/llava-1.5-7b-hf"
        },
        {
            "name": "BLIP-2",
            "model_id": "Salesforce/blip-image-captioning-base",
            "endpoint": "https://api-inference.huggingface.co/pipeline/image-to-text"
        }
    ]
    
    dummy_image = b"dummy_image_data_for_testing"
    image_base64 = base64.b64encode(dummy_image).decode('utf-8')
    
    for model in models:
        print(f"\nTESTING: {model['name']}...")
        
        try:
            async with aiohttp.ClientSession() as session:
                if "pipeline" in model['endpoint']:
                    payload = {
                        "inputs": f"data:image/jpeg;base64,{image_base64}",
                        "parameters": {"max_new_tokens": 100}
                    }
                else:
                    payload = {
                        "inputs": [
                            {"type": "text", "text": "Describe this image in detail."},
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}}
                        ],
                        "parameters": {"max_new_tokens": 200, "temperature": 0.7}
                    }
                
                async with session.post(
                    model['endpoint'],
                    headers=headers,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=60)
                ) as resp:
                    if resp.status == 200:
                        print(f"SUCCESS: {model['name']} test successful")
                    elif resp.status == 503:
                        print(f"LOADING: {model['name']} is loading")
                    elif resp.status == 404:
                        print(f"ERROR: {model['name']} not found")
                    else:
                        print(f"ERROR: {model['name']} test failed: {resp.status}")
                        
        except Exception as e:
            print(f"ERROR: {model['name']} test exception: {str(e)}")

async def test_service_integration(api_key):
    """Test Hugging Face service integration with the app"""
    print("\nTESTING: Service integration...")
    
    try:
        import sys
        sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
        
        from app.services.huggingface_service import LLaVAService, BLIP2Service, InstructBLIPService
        from app.services.vlm_service import vlm_manager
        
        llava_service = LLaVAService(api_key)
        blip2_service = BLIP2Service(api_key)
        instructblip_service = InstructBLIPService(api_key)
        
        vlm_manager.register_service(llava_service)
        vlm_manager.register_service(blip2_service)
        vlm_manager.register_service(instructblip_service)
        
        print(f"SUCCESS: All services registered. Available: {list(vlm_manager.services.keys())}")
        
        dummy_image_bytes = b"dummy_image_data_for_testing"
        
        try:
            result = await llava_service.generate_caption(dummy_image_bytes, "Describe this image")
            print(f"SUCCESS: LLaVA service test completed")
        except Exception as e:
            print(f"ERROR: LLaVA service test failed: {e}")
        
        try:
            result = await blip2_service.generate_caption(dummy_image_bytes, "Describe this image")
            print(f"SUCCESS: BLIP2 service test completed")
        except Exception as e:
            print(f"ERROR: BLIP2 service test failed: {e}")
        
        try:
            result = await instructblip_service.generate_caption(dummy_image_bytes, "Describe this image")
            print(f"SUCCESS: InstructBLIP service test completed")
        except Exception as e:
            print(f"ERROR: InstructBLIP service test failed: {e}")
            
    except ImportError as e:
        print(f"ERROR: Could not import services: {e}")
    except Exception as e:
        print(f"ERROR: Service integration test failed: {e}")

async def main():
    """Run all Hugging Face tests"""
    print("Hugging Face Integration Tests")
    print("=" * 50)
    
    api_key = await test_api_key()
    if not api_key:
        print("\nERROR: Cannot proceed without valid API key")
        return
    
    await test_basic_models(api_key)
    await test_vision_models(api_key)
    await test_service_integration(api_key)
    
    print("\n" + "=" * 50)
    print("All Hugging Face tests completed")

if __name__ == "__main__":
    asyncio.run(main())
