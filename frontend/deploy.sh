#!/bin/bash
# Deploy to Vercel
if command -v vercel &> /dev/null; then
  vercel --prod
else
  echo "Installing Vercel CLI..."
  npm i -g vercel
  vercel --prod
fi
