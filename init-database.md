# Database Initialization Instructions

## Step 1: Run the Complete Schema
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase/fix_complete_schema.sql`
4. Run the script

## Step 2: Verify Tables Created
After running the script, you should have these tables:
- `admin_users`
- `games` 
- `bingo_cards` (with 100 pre-generated cards)
- `players`
- `called_numbers`
- `bingo_patterns` (with default patterns)
- `game_rules` (with default rules)
- `player_cards`

## Step 3: Check Realtime
The script automatically enables realtime for all necessary tables.

## Step 4: Test the Application
1. Restart your Next.js development server: `npm run dev`
2. The 400 and 404 errors should be resolved
3. The multiple GoTrueClient warning should be fixed

## Troubleshooting
If you still see errors:
1. Check that all tables exist in your Supabase dashboard
2. Verify that RLS policies are enabled
3. Ensure realtime is enabled for the tables
4. Check your environment variables in `.env.local`

## Default Admin Credentials
- Username: `admin`
- Password: (You'll need to hash a password and update the admin_users table)