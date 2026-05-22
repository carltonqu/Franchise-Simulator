#!/bin/bash
# Setup Vercel environment variables

echo "Setting up Vercel environment variables..."

# Production
echo "https://franchise-simulator.vercel.app" | vercel env add FRONTEND_URL production

# Preview (all branches)
echo "" | vercel env add FRONTEND_URL preview

# Development
echo "http://localhost:5174" | vercel env add FRONTEND_URL development

echo "Environment variables set up complete!"
