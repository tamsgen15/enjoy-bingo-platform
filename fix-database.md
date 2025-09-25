# Fix Database Constraints - URGENT

## Problem
The application is getting 500 errors due to a database constraint violation:
```
duplicate key value violates unique constraint "players_game_id_selected_card_number_key"
```

## Solution
Run the SQL script in Supabase SQL Editor to fix the constraint issues.

## Steps:

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Navigate to SQL Editor

2. **Run the Fix Script**
   - Copy the contents of `supabase/fix_database_constraints.sql`
   - Paste and execute in SQL Editor

3. **Restart Development Server**
   ```bash
   npm run dev
   ```

## What the Fix Does:
- Removes old constraint `players_game_id_selected_card_number_key`
- Adds proper constraint `players_game_id_card_number_key`
- Creates database functions for better error handling
- Updates API endpoints to use these functions

## Test After Fix:
1. Try joining a game with a card number
2. Check that players load properly
3. Verify no more 500 errors in console

The fix ensures that:
- Each card can only be used once per game
- Proper error messages for duplicate cards
- Better API error handling