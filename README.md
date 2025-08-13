---
title: PromptAid Vision
emoji: 🚀
colorFrom: blue
colorTo: red
sdk: docker
app_port: 8080
---

# PromptAid Vision

AI-powered crisis map analysis platform using Vision Language Models.

## Features

- **Crisis map/drone imagery analysis**
- **Explore & export database**
- **Analytics dashboard**

## Tech Stack

- **Backend**: FastAPI, Python 3.11
- **AI Models**: OpenAI GPT-4V, Google Gemini, Hugging Face models
- **Database**: PostgreSQL
- **Storage**: S3-compatible storage
- **Frontend**: React with TypeScript

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `S3_ENDPOINT`: S3-compatible storage endpoint
- `S3_ACCESS_KEY`: Storage access key
- `S3_SECRET_KEY`: Storage secret key
- `S3_BUCKET`: Storage bucket name
- `OPENAI_API_KEY`: OpenAI API key
- `GOOGLE_API_KEY`: Google API key
- `HF_API_KEY`: Hugging Face API key

## API Endpoints

- `/api/images` - Image management
- `/api/captions` - AI caption generation
- `/api/metadata` - Metadata operations
- `/api/models` - Available AI models
- `/api/contribute` - Contribution system
