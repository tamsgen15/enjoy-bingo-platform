# Setup Printed Bingo Cards

## Overview
Your printed bingo cards need to match exactly with the database. Follow these steps to ensure synchronization.

## Step 1: Run Database Schema
```bash
# In Supabase SQL Editor, run:
supabase/fix_complete_schema.sql
supabase/use_printed_cards_schema.sql
```

## Step 2: Extract Current Card Data
```bash
# Run this to get your current database cards
python extract-printed-cards.py
```

This creates:
- `src/lib/printedBingoCards.js` - JavaScript card data
- `supabase/insert_printed_cards.sql` - SQL to recreate cards

## Step 3: Verify Card Matching
Your printed cards (001-100) should now match the database exactly.

## Step 4: Update Admin Interface
The admin can now assign cards 1-100 knowing they match the physical printed cards.

## Card Format
- **B Column**: Numbers 1-15 (5 numbers)
- **I Column**: Numbers 16-30 (5 numbers)  
- **N Column**: Numbers 31-45 (4 numbers, FREE space in middle)
- **G Column**: Numbers 46-60 (5 numbers)
- **O Column**: Numbers 61-75 (5 numbers)

## Usage in Game
1. Admin assigns card numbers (1-100) to players
2. Players receive physical printed cards matching those numbers
3. Database validates wins against exact printed card layout
4. No discrepancy between digital and physical cards

## Files Modified
- `src/lib/bingoCards.js` - Updated to use printed cards
- `supabase/fix_complete_schema.sql` - Removed random generation
- `supabase/use_printed_cards_schema.sql` - Added printed card validation