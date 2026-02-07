# Vercel Project Settings Fix

## The Problem

Vercel is building from the root directory instead of the `frontend` directory, which is why it's not finding the correct files even though they're committed.

## Solution: Configure Vercel Project Settings

### Option 1: Update via Vercel Dashboard (Recommended)

1. Go to your Vercel project dashboard
2. Click **Settings**
3. Go to **General** section
4. Update these settings:

   **Root Directory**:
   ```
   frontend
   ```
   
   **Build Command**:
   ```
   npm run build
   ```
   
   **Output Directory**:
   ```
   .next
   ```
   
   **Install Command**:
   ```
   npm install
   ```

5. Click **Save**
6. Go to **Deployments** tab
7. Click the three dots on the latest deployment → **Redeploy**

### Option 2: Delete and Reconnect Project

If Option 1 doesn't work:

1. Go to Vercel project **Settings**
2. Scroll to bottom → **Delete Project**
3. Reconnect your GitHub repository
4. During setup, set **Root Directory** to `frontend`
5. Deploy

### Option 3: Use vercel.json (Already Done)

The `vercel.json` file has been updated to:
```json
{
  "buildCommand": "cd frontend && npm run build",
  "outputDirectory": "frontend/.next",
  "installCommand": "cd frontend && npm install"
}
```

This should work, but Vercel dashboard settings take precedence.

## Verification

After updating settings and redeploying, you should see:
- Build starts in the `frontend` directory
- No more "Cannot read properties of null" error
- Successful deployment

## If Still Failing

Check the build logs for:
1. Which directory Vercel is building from
2. Whether it's finding the correct `package.json`
3. Whether the `dynamic = 'force-dynamic'` export is present in the built files

## Quick Fix Command

If you have Vercel CLI installed:
```bash
cd frontend
vercel --prod
```

This will deploy directly from the frontend directory.
