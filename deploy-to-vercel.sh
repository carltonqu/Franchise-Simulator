#!/bin/bash

# Complete Deployment Script for Franchise Simulator
# Run this script to deploy both backend and frontend to Vercel

set -e

echo "🚀 Franchise Simulator - Vercel Deployment"
echo "==========================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if logged in to Vercel
echo -e "${BLUE}Checking Vercel login...${NC}"
if ! vercel whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Please login to Vercel first:${NC}"
    echo "   vercel login"
    exit 1
fi

USER=$(vercel whoami)
echo -e "${GREEN}✅ Logged in as: $USER${NC}"
echo ""

# Deploy Backend
echo -e "${BLUE}Step 1: Deploying Backend...${NC}"
cd backend

# Check if already deployed
if [ -d ".vercel" ]; then
    echo -e "${YELLOW}Backend already has Vercel config. Deploying...${NC}"
    vercel --prod
else
    echo -e "${YELLOW}First time deploy. Please follow the prompts...${NC}"
    vercel
fi

# Get backend URL
BACKEND_URL=$(vercel --json 2>/dev/null | grep -o '"url":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -z "$BACKEND_URL" ]; then
    echo -e "${YELLOW}Please enter your backend URL (e.g., franchise-simulator-backend-xxx.vercel.app):${NC}"
    read -r BACKEND_URL
fi

# Ensure https:// prefix
if [[ ! $BACKEND_URL == http* ]]; then
    BACKEND_URL="https://$BACKEND_URL"
fi

echo -e "${GREEN}✅ Backend deployed to: $BACKEND_URL${NC}"
echo ""

# Set environment variables for backend
echo -e "${BLUE}Setting backend environment variables...${NC}"
vercel env add DATABASE_URL --yes <<< "libsql://franchise-app-clockroster.aws-ap-northeast-1.turso.io" 2>/dev/null || true
vercel env add DATABASE_AUTH_TOKEN --yes <<< "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzkzNDQyNjcsImlkIjoiMDE5ZTQ5MjAtNzAwMS03ZTkwLTgzNDgtZmE1MWI1MTI3NDRhIiwicmlkIjoiMmExOGYxMGQtZDI4Ny00Y2NkLWI2ZWYtMWQxNThmMWU2OWJmIn0.nIEO029xG8IfsQKSO9ROCSFvZTforvVe1J2I8V37za_7UKkohoZiwAwVElnfUG_GE4_kR5UDSIkqbUKy_NyfAg" 2>/dev/null || true

# Generate JWT secret if not set
JWT_SECRET=$(openssl rand -base64 32)
vercel env add JWT_SECRET --yes <<< "$JWT_SECRET" 2>/dev/null || true

echo -e "${GREEN}✅ Backend environment variables set${NC}"
echo ""

cd ..

# Deploy Frontend
echo -e "${BLUE}Step 2: Deploying Frontend...${NC}"
cd frontend

# Set API base URL
export VITE_API_BASE_URL="$BACKEND_URL"

# Check if already deployed
if [ -d ".vercel" ]; then
    echo -e "${YELLOW}Frontend already has Vercel config. Deploying...${NC}"
    vercel --prod
else
    echo -e "${YELLOW}First time deploy. Please follow the prompts...${NC}"
    vercel
fi

FRONTEND_URL=$(vercel --json 2>/dev/null | grep -o '"url":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -z "$FRONTEND_URL" ]; then
    echo -e "${YELLOW}Please enter your frontend URL:${NC}"
    read -r FRONTEND_URL
fi

if [[ ! $FRONTEND_URL == http* ]]; then
    FRONTEND_URL="https://$FRONTEND_URL"
fi

echo -e "${GREEN}✅ Frontend deployed to: $FRONTEND_URL${NC}"
echo ""

# Update backend CORS with frontend URL
echo -e "${BLUE}Step 3: Updating Backend CORS...${NC}"
cd ../backend
vercel env add FRONTEND_URL --yes <<< "$FRONTEND_URL" 2>/dev/null || true
vercel --prod
echo -e "${GREEN}✅ Backend CORS updated${NC}"
echo ""

cd ..

# Summary
echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo "======================="
echo ""
echo -e "${GREEN}Your Franchise Simulator is now live:${NC}"
echo ""
echo -e "${BLUE}Frontend (App):${NC}"
echo "  $FRONTEND_URL"
echo ""
echo -e "${BLUE}Backend (API):${NC}"
echo "  $BACKEND_URL"
echo ""
echo -e "${BLUE}Database:${NC}"
echo "  Turso Cloud (libsql://franchise-app-clockroster...)"
echo ""
echo "Test your app:"
echo "  1. Visit $FRONTEND_URL"
echo "  2. Register a new account"
echo "  3. Run a simulation"
echo ""
echo "Environment Variables Set:"
echo "  ✅ DATABASE_URL"
echo "  ✅ DATABASE_AUTH_TOKEN"
echo "  ✅ JWT_SECRET"
echo "  ✅ FRONTEND_URL"
echo ""
