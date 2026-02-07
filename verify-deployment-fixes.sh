#!/bin/bash

# Verification script for deployment fixes

echo "🔍 Verifying Deployment Fixes..."
echo "================================"
echo ""

ERRORS=0
WARNINGS=0

# Check 1: Verify all authenticated pages have dynamic export
echo "✓ Checking authenticated pages for dynamic export..."
MISSING_DYNAMIC=0

for file in frontend/src/app/\[locale\]/\(authenticated\)/**/page.tsx; do
  if [ -f "$file" ]; then
    if ! grep -q "export const dynamic = 'force-dynamic'" "$file"; then
      echo "  ❌ Missing in: $file"
      MISSING_DYNAMIC=$((MISSING_DYNAMIC + 1))
      ERRORS=$((ERRORS + 1))
    fi
  fi
done

if [ $MISSING_DYNAMIC -eq 0 ]; then
  echo "  ✅ All authenticated pages have dynamic export"
else
  echo "  ❌ $MISSING_DYNAMIC pages missing dynamic export"
fi
echo ""

# Check 2: Verify .env.production doesn't have NODE_ENV
echo "✓ Checking .env.production for NODE_ENV..."
if [ -f "frontend/.env.production" ]; then
  if grep -q "^NODE_ENV=" "frontend/.env.production"; then
    echo "  ❌ NODE_ENV found in .env.production (should be removed)"
    ERRORS=$((ERRORS + 1))
  else
    echo "  ✅ No NODE_ENV in .env.production"
  fi
else
  echo "  ⚠️  .env.production not found"
  WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Check 3: Verify pre-commit hook exists and is executable
echo "✓ Checking pre-commit hook..."
if [ -f ".git/hooks/pre-commit" ]; then
  if [ -x ".git/hooks/pre-commit" ]; then
    echo "  ✅ Pre-commit hook is installed and executable"
  else
    echo "  ⚠️  Pre-commit hook exists but is not executable"
    echo "     Run: chmod +x .git/hooks/pre-commit"
    WARNINGS=$((WARNINGS + 1))
  fi
else
  echo "  ❌ Pre-commit hook not found"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 4: Verify authenticated layout has dynamic export
echo "✓ Checking authenticated layout..."
if [ -f "frontend/src/app/[locale]/(authenticated)/layout.tsx" ]; then
  if grep -q "export const dynamic = 'force-dynamic'" "frontend/src/app/[locale]/(authenticated)/layout.tsx"; then
    echo "  ✅ Authenticated layout has dynamic export"
  else
    echo "  ❌ Authenticated layout missing dynamic export"
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "  ❌ Authenticated layout not found"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 5: Count total authenticated pages
echo "✓ Counting authenticated pages..."
TOTAL_PAGES=$(find frontend/src/app/\[locale\]/\(authenticated\) -name "page.tsx" -type f | wc -l | tr -d ' ')
echo "  📊 Found $TOTAL_PAGES authenticated pages"
echo ""

# Summary
echo "================================"
echo "📊 Verification Summary"
echo "================================"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo "✅ All checks passed! You're ready to deploy."
  echo ""
  echo "Next steps:"
  echo "1. Commit your changes: git add . && git commit -m 'fix: deployment errors'"
  echo "2. Push to repository: git push"
  echo "3. Set up database on Render (see RENDER_DATABASE_SETUP.md)"
  echo "4. Deploy and verify"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo "⚠️  All critical checks passed with $WARNINGS warning(s)"
  echo ""
  echo "You can proceed with deployment, but consider addressing the warnings."
  exit 0
else
  echo "❌ Verification failed with $ERRORS error(s) and $WARNINGS warning(s)"
  echo ""
  echo "Please fix the errors above before deploying."
  exit 1
fi
