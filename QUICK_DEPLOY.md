# 🚀 Quick Deploy to Vercel

## Method 1: Automated Deploy (Recommended)

```bash
npm run deploy
```

## Method 2: Manual Deploy

### Step 1: Install Vercel CLI
```bash
npm i -g vercel
```

### Step 2: Deploy
```bash
vercel --prod
```

### Step 3: Set Environment Variables
In Vercel dashboard, add:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Method 3: GitHub + Vercel Dashboard

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Add environment variables
5. Deploy

## ⚠️ IMPORTANT: Before Testing

**Run this SQL script in Supabase first:**
```sql
-- Copy contents from: supabase/fix_database_errors.sql
```

## ✅ Your app will be live at:
`https://your-project-name.vercel.app`

## 🔧 Troubleshooting

**Build fails?** 
- Check `npm run build` works locally
- Remove `node_modules` and run `npm install`

**Database errors?**
- Run the database setup script
- Check environment variables are set

**App not loading?**
- Check browser console for errors
- Verify Supabase credentials