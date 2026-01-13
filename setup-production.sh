#!/bin/bash

# Elevare Production Setup Script
# This script helps you set up your production environment

echo "🚀 Elevare Production Setup"
echo "=========================="

# Check if required tools are installed
echo "📋 Checking prerequisites..."

if ! command -v flyctl &> /dev/null; then
    echo "❌ Fly CLI not found. Please install it first:"
    echo "   brew install flyctl  # macOS"
    echo "   curl -L https://fly.io/install.sh | sh  # Linux"
    exit 1
fi

if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Please install it first:"
    echo "   npm i -g vercel"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Generate secure secrets
echo "🔐 Generating secure secrets..."
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)

echo "Generated JWT secrets (save these!):"
echo "JWT_SECRET: $JWT_SECRET"
echo "JWT_REFRESH_SECRET: $JWT_REFRESH_SECRET"

# Prompt for configuration
echo ""
echo "📝 Please provide the following information:"

read -p "Enter your production email (for SMTP): " PROD_EMAIL
read -p "Enter your Gmail app password (16 characters): " GMAIL_APP_PASSWORD
read -p "Enter your domain name (optional, press enter to skip): " DOMAIN_NAME

# Update backend .env.production
echo "📄 Updating backend/.env.production..."
sed -i.bak "s/your_super_secure_jwt_secret_min_32_chars_long_production_change_this/$JWT_SECRET/g" backend/.env.production
sed -i.bak "s/your_super_secure_refresh_secret_also_32_chars_long_change_this/$JWT_REFRESH_SECRET/g" backend/.env.production
sed -i.bak "s/your_production_email@gmail.com/$PROD_EMAIL/g" backend/.env.production
sed -i.bak "s/your_gmail_app_password_16_chars/$GMAIL_APP_PASSWORD/g" backend/.env.production

if [ ! -z "$DOMAIN_NAME" ]; then
    sed -i.bak "s/noreply@yourdomain.com/noreply@$DOMAIN_NAME/g" backend/.env.production
fi

echo "✅ Configuration files updated"

echo ""
echo "🎯 Next steps:"
echo "1. Run the database migration: psql -d your_db < migrations/add_profile_fields.sql"
echo "2. Deploy backend: cd backend && fly deploy"
echo "3. Deploy summarization service: cd summarization-service && fly deploy"
echo "4. Deploy frontend: cd frontend && vercel --prod"
echo "5. Update CORS_ORIGIN in backend with your actual frontend URL"
echo ""
echo "📖 See DEPLOYMENT_GUIDE.md for detailed instructions"