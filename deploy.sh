#!/bin/bash

echo "🚀 PromptAid Vision Deployment Script"
echo "====================================="

echo "📦 Building backend Docker image..."
cd py_backend
docker build -t promptaid-vision-backend .

if [ $? -eq 0 ]; then
    echo "✅ Backend image built successfully!"
else
    echo "❌ Backend image build failed!"
    exit 1
fi

cd ..

echo "🧪 Testing production setup locally..."
docker-compose -f docker-compose.prod.yml up -d

echo "⏳ Waiting for services to start..."
sleep 10

echo "🔍 Checking backend health..."
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/models)

if [ $response -eq 200 ]; then
    echo "✅ Backend is healthy and responding!"
else
    echo "❌ Backend health check failed (HTTP $response)"
    echo "📋 Stopping services..."
    docker-compose -f docker-compose.prod.yml down
    exit 1
fi

echo "📋 Stopping test services..."
docker-compose -f docker-compose.prod.yml down

echo ""
echo "🎉 Deployment preparation completed!"
echo ""
echo "📋 Next steps:"
echo "1. Set up cloud database (PostgreSQL)"
echo "2. Set up cloud storage (S3-compatible)"
echo "3. Configure environment variables in Hugging Face Spaces"
echo "4. Push your code to Hugging Face Spaces"
echo ""
echo "🔧 To test locally again, run:"
echo "   docker-compose -f docker-compose.prod.yml up"
echo ""
echo "🌍 To deploy to Hugging Face Spaces:"
echo "   git add ."
echo "   git commit -m 'Prepare for Hugging Face Spaces deployment'"
echo "   git push"
