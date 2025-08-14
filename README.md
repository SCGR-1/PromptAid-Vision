---
title: PromptAid Vision
emoji: 🚀
colorFrom: blue
colorTo: red
sdk: docker
app_port: 7860
pinned: false
---

# PromptAid Vision
AI-powered crisis map analysis platform using Vision Language Models.

## Features
- Crisis map/drone imagery analysis
- Explore & export database
- Analytics dashboard

## Tech Stack
Backend: FastAPI (Python 3.11)  
Frontend: React + TS  
Database: PostgreSQL (use external DB in Spaces)  
Storage: S3-compatible (use external service)  
Models: OpenAI / Gemini / HF

## Env Vars
DATABASE_URL, S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET, OPENAI_API_KEY, GOOGLE_API_KEY, HF_API_KEY
