# Multiplayer Bingo Game

A real-time multiplayer bingo game built with Next.js (App Router) and Supabase.

## Features

- 75-number classic bingo with 1-100 card selection
- Real-time multiplayer gameplay
- Betting system on number grid (1-100)
- Auto number calling system
- Admin host controls
- Dynamic bingo card generation
- Database-stored game rules and logic

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Setup Supabase:**
   - Create a new Supabase project
   - Copy `.env.example` to `.env.local`
   - Add your Supabase URL and keys
   - Run the SQL schema in `supabase/schema.sql`

3. **Run development server:**
   ```bash
   npm run dev
   ```

## Database Schema

The game uses these main tables:
- `games` - Game sessions and settings
- `bingo_cards` - Generated cards for each number selection
- `players` - Player information and bets
- `called_numbers` - Numbers called during games
- `game_rules` - Configurable game rules

## Game Flow

1. Players select card numbers (1-100)
2. Players place bets on number grid
3. Admin starts game when sufficient players join
4. System auto-calls numbers
5. Players mark their cards
6. First to complete pattern wins

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Real-time subscriptions)
- **Authentication:** Supabase Auth
- **Deployment:** Vercel (recommended)