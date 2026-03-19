#!/bin/bash

# OAuth Setup Script for Elevare
# This script installs dependencies and runs the database migration

echo "🚀 Setting up OAuth for Elevare..."
echo ""

# Check if we're in the project root
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install passport passport-google-oauth20 passport-facebook
npm install --save-dev @types/passport @types/passport-google-oauth20 @types/passport-facebook

if [ $? -ne 0 ]; then
    echo "❌ Failed to install backend dependencies"
    exit 1
fi

echo "✅ Backend dependencies installed"
echo ""

# Run database migration
echo "🗄️  Running database migration..."
npm run migrate:dev

if [ $? -ne 0 ]; then
    echo "⚠️  Migration failed. You may need to run it manually:"
    echo "   cd backend && npm run migrate:dev"
    echo "   OR"
    echo "   psql -U postgres -d elevare_dev -f migrations/008_add_oauth_fields.sql"
fi

echo ""
echo "✅ OAuth setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Configure OAuth credentials in Google Cloud Console and Facebook Developers"
echo "2. Update backend/.env with your OAuth credentials"
echo "3. Start the backend: cd backend && npm run dev"
echo "4. Start the frontend: cd frontend && npm run dev"
echo "5. Test OAuth login at http://localhost:3001/login"
echo ""
echo "📖 For detailed instructions, see OAUTH_SETUP_COMPLETE.md"
