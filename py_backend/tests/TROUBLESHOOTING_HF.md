# Hugging Face API Troubleshooting Guide

## 🚨 Common Issues and Solutions

### 1. 404 "Not Found" Error

**Problem**: Getting a 404 error when trying to use LLaVA or other models.

**Possible Causes**:
- Model ID is incorrect or doesn't exist
- Model is not available on Hugging Face Inference API
- Model requires special access or is private

**Solutions**:

#### A. Verify Model Exists
Check if the model exists on Hugging Face:
```bash
# Visit these URLs in your browser:
https://huggingface.co/llava-hf/llava-1.5-7b-hf
https://huggingface.co/Salesforce/blip-image-captioning-base
https://huggingface.co/nlpconnect/vit-gpt2-image-captioning
```

#### B. Use Alternative Models
If the original models don't work, try these alternatives:

```python
# Alternative LLaVA models
"llava-hf/llava-1.5-7b-hf"  # Original
"llava-hf/llava-1.5-13b-hf" # Larger, more capable
"llava-hf/llava-1.5-7b-hf"  # Different variant

# Alternative BLIP models
"Salesforce/blip-image-captioning-base"  # Original
"Salesforce/blip-image-captioning-large" # Larger
"microsoft/git-base"                     # Alternative

# Alternative InstructBLIP models
"nlpconnect/vit-gpt2-image-captioning"  # Original
"microsoft/DialoGPT-medium"              # Alternative
```

#### C. Check Model Access
Some models require:
- Hugging Face Pro subscription
- Model owner approval
- Special access tokens

### 2. 503 "Service Unavailable" Error

**Problem**: Getting a 503 error with "loading" message.

**Cause**: Model is still loading on Hugging Face servers.

**Solutions**:
- **Wait**: Models can take 1-5 minutes to load on first request
- **Retry**: Make the same request again after waiting
- **Use Different Model**: Try a smaller, faster-loading model

### 3. API Key Issues

**Problem**: Authentication failures or invalid API key errors.

**Solutions**:

#### A. Verify API Key
```bash
# Test your API key
curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://huggingface.co/api/whoami
```

#### B. Check API Key Permissions
- Ensure your Hugging Face account has API access
- Check if you need a Pro subscription for certain models
- Verify the API key is correctly copied (no extra spaces)

#### C. Generate New API Key
1. Go to https://huggingface.co/settings/tokens
2. Create a new token with "read" permissions
3. Update your `.env` file

### 4. Model Loading Timeouts

**Problem**: Requests timeout after 120 seconds.

**Solutions**:
- **Increase Timeout**: Modify the timeout in `huggingface_service.py`
- **Use Smaller Models**: Smaller models load faster
- **Check Network**: Ensure stable internet connection

### 5. Rate Limiting

**Problem**: Getting rate limit errors.

**Solutions**:
- **Free Tier Limits**: Free accounts have rate limits
- **Upgrade Account**: Consider Hugging Face Pro for higher limits
- **Implement Retry Logic**: Add exponential backoff

## 🔧 Quick Fixes

### 1. Test Basic API Access
```bash
cd py_backend
python test_hf_detailed.py
```

### 2. Check Environment Variables
```bash
# Ensure these are set in your .env file
HF_API_KEY=your_actual_api_key_here
```

### 3. Verify Model Endpoints
```bash
# Test individual endpoints
curl -X POST "https://api-inference.huggingface.co/models/llava-hf/llava-1.5-7b-hf" \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"inputs": "Hello, test message"}'
```

### 4. Check Hugging Face Status
- Visit https://status.huggingface.co/
- Check if there are any service outages

## 🚀 Alternative Models to Try

### Vision-Language Models (Recommended)
```python
# LLaVA alternatives
"llava-hf/llava-1.5-7b-hf"      # Good balance
"llava-hf/llava-1.5-13b-hf"     # More capable, slower
"llava-hf/llava-1.5-7b-hf"      # Different variant

# BLIP alternatives
"Salesforce/blip-image-captioning-base"   # Fast, reliable
"Salesforce/blip-image-captioning-large"  # Better quality
"microsoft/git-base"                      # Alternative approach

# General vision models
"google/vit-base-patch16-224"             # Vision transformer
"facebook/detr-resnet-50"                 # Object detection
```

### Text Generation Models (Fallback)
```python
# If vision models fail, use text models
"gpt2"                                    # Basic text generation
"microsoft/DialoGPT-medium"               # Conversational
"distilgpt2"                              # Smaller, faster
```

## 📊 Debug Information

### Enable Verbose Logging
The service includes comprehensive debug logging. Check your console for:
- API request details
- Response status codes
- Error messages
- Model loading status

### Common Error Messages
```
404 Not Found: Model doesn't exist or isn't accessible
503 Service Unavailable: Model is loading
401 Unauthorized: Invalid API key
429 Too Many Requests: Rate limited
500 Internal Server Error: Hugging Face server issue
```

## 🎯 Next Steps

1. **Run the detailed test script** to identify the specific issue
2. **Check model accessibility** on Hugging Face website
3. **Verify API key permissions** and validity
4. **Try alternative models** if the original ones don't work
5. **Check Hugging Face status** for any service issues

## 📞 Getting Help

- **Hugging Face Documentation**: https://huggingface.co/docs/api-inference
- **Hugging Face Community**: https://huggingface.co/community
- **GitHub Issues**: Check model-specific repositories for known issues
- **API Status**: https://status.huggingface.co/
