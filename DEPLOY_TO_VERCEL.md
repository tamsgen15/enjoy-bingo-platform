# Deploy to Vercel - Quick Guide

## Prerequisites
1. **Fix Database First**: Run the SQL script in Supabase before deploying
2. **GitHub Account**: Your code should be in a GitHub repository
3. **Vercel Account**: Sign up at vercel.com

## Step 1: Prepare for Deployment

### Install Vercel CLI (Optional)
```bash
npm i -g vercel
```

### Clean Dependencies
```bash
npm install
```

## Step 2: Deploy via Vercel Dashboard

1. **Go to [vercel.com](https://vercel.com)**
2. **Sign in with GitHub**
3. **Click "New Project"**
4. **Import your repository**
5. **Configure project:**
   - Framework Preset: **Next.js**
   - Root Directory: **/** (default)
   - Build Command: **npm run build** (default)
   - Output Directory: **.next** (default)

## Step 3: Set Environment Variables

In Vercel project settings, add these environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://gvfcbzzindikkmhaahak.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2ZmNienppbmRpa2ttaGFhaGFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NjU5MzYsImV4cCI6MjA3MjA0MTkzNn0.9Pc-juJB8PqZkznfjQOERM27Gpap-wvIiG7aLkEFkMc
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2ZmNienppbmRpa2ttaGFhaGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQ2NTkzNiwiZXhwIjoyMDcyMDQxOTM2fQ.f43ZuM32PlxzlJJdKKb0vPshmjRo0Mune3k4unO9IhU
```

## Step 4: Deploy

Click **"Deploy"** and wait for the build to complete.

## Alternative: Deploy via CLI

```bash
# Login to Vercel
vercel login

# Deploy
vercel

# Follow prompts:
# - Link to existing project? N
# - Project name: bingo-multiplayer
# - Directory: ./
# - Override settings? N
```

## Post-Deployment

1. **Test the app** at your Vercel URL
2. **Run database setup** if you haven't already
3. **Check for any console errors**

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure all dependencies are compatible with Vercel
- Remove any Node.js-specific packages

### Database Errors
- Verify environment variables are set correctly
- Run the database setup script in Supabase
- Check Supabase project is not paused

### App Not Loading
- Check browser console for errors
- Verify Supabase URL and keys are correct
- Ensure all required tables exist

## Quick Deploy Command
```bash
# One-line deploy (after setup)
vercel --prod
```

Your app will be available at: `https://your-project-name.vercel.app`