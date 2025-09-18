# Real-time Setup Instructions

## 1. Enable Real-time in Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to Database > Replication
3. Enable real-time for these tables:
   - `games`
   - `players` 
   - `called_numbers`

## 2. Run the SQL Script

Execute the SQL in `supabase/enable_realtime.sql` in your Supabase SQL editor.

## 3. Environment Variables

Make sure your `.env.local` has:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 4. Test Real-time

1. Open admin page in one browser tab: `/admin`
2. Open game page in another tab: `/`
3. Create a game in admin → should appear in game page instantly
4. Add players in admin → should appear in game page instantly
5. Start game in admin → numbers should be called and appear in both pages

## Features Now Working Real-time

✅ Game creation/updates
✅ Player joining
✅ Number calling (auto every 4 seconds)
✅ Winner verification
✅ Cross-browser synchronization
✅ All existing UI preserved
✅ All existing functionality preserved