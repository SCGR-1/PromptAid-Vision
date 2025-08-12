# Hugging Face VLM Integration

This document explains how to use Hugging Face Vision-Language Models (VLMs) in your PromptAid Vision application.

## 🚀 Quick Start

### 1. Environment Setup

Add your Hugging Face API key to your `.env` file:

```bash
# .env
HF_API_KEY=your_huggingface_api_key_here
```

### 2. Available Models

The following Hugging Face models are automatically registered when you start the application:

- **LLaVA 1.5 7B** (`LLAVA_1_5_7B`) - Advanced vision-language model
- **BLIP-2** (`BLIP2_OPT_2_7B`) - Image captioning specialist
- **InstructBLIP** (`INSTRUCTBLIP_VICUNA_7B`) - Instruction-following vision model

### 3. How It Works

The Hugging Face services follow the same pattern as GPT-4 and Gemini:

1. **Image Processing**: Converts uploaded images to base64 format
2. **Prompt Enhancement**: Automatically adds metadata extraction instructions
3. **API Call**: Sends request to Hugging Face Inference API
4. **Response Parsing**: Extracts caption and metadata from JSON response
5. **Fallback Handling**: Gracefully handles parsing errors

## 🔧 Technical Details

### Service Architecture

```python
class HuggingFaceService(VLMService):
    """Base class for all Hugging Face VLM services"""
    
    async def generate_caption(self, image_bytes: bytes, prompt: str) -> Dict[str, Any]:
        # 1. Build enhanced prompt with metadata extraction
        # 2. Prepare API payload
        # 3. Make async HTTP request
        # 4. Parse response and extract metadata
        # 5. Return structured result
```

### Model-Specific Services

```python
class LLaVAService(HuggingFaceService):
    """LLaVA 1.5 7B - Advanced vision-language understanding"""
    
class BLIP2Service(HuggingFaceService):
    """BLIP-2 - Specialized image captioning"""
    
class InstructBLIPService(HuggingFaceService):
    """InstructBLIP - Instruction-following vision model"""
```

### API Endpoints

The services use Hugging Face's Inference API:

- **Vision Models**: `https://api-inference.huggingface.co/models/{model_id}`
- **Text Models**: `https://api-inference.huggingface.co/models/{model_id}`

### Response Format

All services return the same structured format:

```json
{
  "caption": "Detailed analysis of the crisis map...",
  "metadata": {
    "title": "Flood Emergency in Coastal Region",
    "source": "PDC",
    "type": "FLOOD",
    "countries": ["US", "MX"],
    "epsg": "4326"
  },
  "confidence": null,
  "processing_time": 2.45,
  "raw_response": {
    "model": "llava-hf/llava-1.5-7b-hf",
    "response": {...},
    "parsed_successfully": true
  }
}
```

## 🧪 Testing

### Run Integration Test

```bash
cd py_backend
python test_hf_integration.py
```

### Test Individual Services

```python
from app.services.huggingface_service import LLaVAService
from app.services.vlm_service import vlm_manager

# Register service
llava_service = LLaVAService("your_api_key")
vlm_manager.register_service(llava_service)

# Test caption generation
result = await vlm_manager.generate_caption(
    image_bytes=your_image_bytes,
    prompt="Describe this crisis map",
    model_name="LLAVA_1_5_7B"
)
```

## 📊 Performance Considerations

### Timeouts
- **Default**: 120 seconds for large models
- **Configurable**: Adjust in `huggingface_service.py`

### Model Selection
- **LLaVA**: Best for complex analysis, slower
- **BLIP-2**: Fastest, good for basic captioning
- **InstructBLIP**: Balanced performance and capability

### Error Handling
- **API Failures**: Automatic fallback to error messages
- **Parsing Errors**: Graceful degradation to raw text
- **Network Issues**: Configurable retry logic

## 🔍 Debugging

### Enable Debug Logging

The services include comprehensive debug logging:

```python
# Check console output for:
# - API request details
# - Response parsing
# - Metadata extraction
# - Error handling
```

### Common Issues

1. **API Key Invalid**: Check `HF_API_KEY` in `.env`
2. **Model Loading**: Some models may take time to load on first request
3. **Rate Limiting**: Hugging Face has rate limits for free tier
4. **Model Compatibility**: Ensure model supports vision tasks

## 🚀 Usage in Frontend

The Hugging Face models are automatically available in your frontend:

```typescript
// In your upload form, users can select:
const modelOptions = [
  { value: 'GPT4O', label: 'GPT-4 Vision' },
  { value: 'GEMINI15', label: 'Google Gemini' },
  { value: 'LLAVA_1_5_7B', label: 'LLaVA 1.5 7B' },      // ← New!
  { value: 'BLIP2_OPT_2_7B', label: 'BLIP-2' },           // ← New!
  { value: 'INSTRUCTBLIP_VICUNA_7B', label: 'InstructBLIP' } // ← New!
];
```

## 📝 Configuration

### Environment Variables

```bash
# Required
HF_API_KEY=your_api_key

# Optional (for advanced configuration)
HF_TIMEOUT=120
HF_MAX_TOKENS=800
HF_TEMPERATURE=0.7
```

### Service Registration

Services are automatically registered in `caption.py`:

```python
if settings.HF_API_KEY:
    llava_service = LLaVAService(settings.HF_API_KEY)
    vlm_manager.register_service(llava_service)
    # ... other services
```

## 🎯 Next Steps

1. **Test Integration**: Run the test script
2. **Verify Models**: Check frontend model selection
3. **Monitor Performance**: Watch API response times
4. **Customize Prompts**: Adjust metadata extraction instructions
5. **Add New Models**: Extend with additional Hugging Face models

## 📚 Resources

- [Hugging Face Inference API](https://huggingface.co/docs/api-inference)
- [LLaVA Model](https://huggingface.co/llava-hf/llava-1.5-7b-hf)
- [BLIP-2 Model](https://huggingface.co/Salesforce/blip-image-captioning-base)
- [InstructBLIP Model](https://huggingface.co/nlpconnect/vit-gpt2-image-captioning)
