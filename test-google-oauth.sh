#!/bin/bash

# Quick test script for Google OAuth
# This script helps you verify everything is set up correctly

echo "🔍 Google OAuth Configuration Check"
echo "===================================="
echo ""

# Check if we're in the project root
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check backend .env
echo "📋 Checking backend configuration..."
if [ ! -f "backend/.env" ]; then
    echo "❌ backend/.env not found"
    exit 1
fi

# Check for Google credentials
if grep -q "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" backend/.env; then
    echo "✅ Google Client Secret configured"
else
    echo "⚠️  Warning: Google Client Secret might not be configured"
fi

if grep -q "4209222695-r8792qbi5a5f4i82bo4p29bv52n2eaf2.apps.googleusercontent.com" backend/.env; then
    echo "✅ Google Client ID configured"
else
    echo "❌ Google Client ID not found"
    exit 1
fi

# Check if dependencies are installed
echo ""
echo "📦 Checking dependencies..."
if [ -d "backend/node_modules/passport" ]; then
    echo "✅ Passport installed"
else
    echo "❌ Passport not installed. Run: cd backend && npm install"
    exit 1
fi

if [ -d "backend/node_modules/passport-google-oauth20" ]; then
    echo "✅ Passport Google OAuth installed"
else
    echo "❌ Passport Google OAuth not installed. Run: cd backend && npm install"
    exit 1
fi

# Check database
echo ""
echo "🗄️  Checking database..."
if psql -U postgres -d elevare_dev -c "SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='oauth_provider';" | grep -q "oauth_provider"; then
    echo "✅ OAuth fields exist in database"
else
    echo "❌ OAuth fields not found. Run: psql -U postgres -d elevare_dev -f migrations/008_add_oauth_fields.sql"
    exit 1
fi

echo ""
echo "✅ All checks passed!"
echo ""
echo "🚀 Ready to test Google OAuth!"
echo ""
echo "Next steps:"
echo "1. Start backend:  cd backend && npm run dev"
echo "2. Start frontend: cd frontend && npm run dev"
echo "3. Open browser:   http://localhost:3001/login"
echo "4. Click 'Continue with Google'"
echo ""
echo "📖 For detailed testing guide, see: GOOGLE_OAUTH_TESTING_GUIDE.md"
