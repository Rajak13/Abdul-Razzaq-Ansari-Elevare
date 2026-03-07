#!/bin/bash

# Deploy Video Call Fixes
# This script commits and pushes the video call fixes

echo "🚀 Deploying Video Call Fixes..."
echo ""

# Check if there are changes to commit
if [[ -z $(git status -s) ]]; then
  echo "✅ No changes to commit"
  exit 0
fi

echo "📝 Files changed:"
git status -s
echo ""

# Add the specific files we modified
echo "➕ Adding modified files..."
git add backend/src/services/socketService.ts
git add frontend/src/components/video-call/video-call.tsx
git add VIDEO_CALL_PRODUCTION_FIXES.md
git add VIDEO_CALL_QUICK_FIX.md
git add VIDEO_CALL_FINAL_DIAGNOSIS.md
git add RENDER_ENV_SETUP.md
git add backend/.env.production.example

echo "✅ Files staged"
echo ""

# Commit
echo "💾 Committing changes..."
git commit -m "Fix video call Socket.io CORS and MediaStream cleanup

- Socket.io now uses config.corsOrigin (respects NODE_ENV)
- Improved MediaStream cleanup to prevent browser warnings
- Added production-ready Socket.io settings
- Fixed track cleanup on component unmount
- Added comprehensive documentation for TURN server setup"

echo "✅ Changes committed"
echo ""

# Push
echo "📤 Pushing to remote..."
git push

echo ""
echo "✅ Deploy complete!"
echo ""
echo "Next steps:"
echo "1. Wait 2-3 minutes for Vercel/Render to deploy"
echo "2. Test at: https://elevarelearning.vercel.app"
echo "3. Check browser console for Socket.io connection"
echo "4. If still failing, see VIDEO_CALL_FINAL_DIAGNOSIS.md for TURN server setup"
