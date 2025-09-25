# Database-Driven Winning System Integration Guide

## Overview
This system implements a comprehensive database-driven winning pattern verification system with real-time monitoring and auto-marking capabilities.

## Setup Steps

### 1. Database Setup
Run the SQL script to set up the database:
```sql
-- Run this in Supabase SQL Editor
\i supabase/complete_winning_system_setup.sql
```

### 2. Import New Services
The system includes these new services:
- `WinningVerificationService` - Core winning pattern verification
- `RealtimeWinnerService` - Real-time winner monitoring
- Enhanced `WinnerModal` - Database-integrated winner display

### 3. Integration Points

#### A. Game Context Integration
The `RealtimeGameContext` has been updated to use the new verification system:
- `verifyWinner()` now uses database patterns
- `assignCard()` initializes player marked positions
- `joinGame()` sets up player tracking

#### B. Real-time Winner Monitoring
Set up winner monitoring in your game component:
```typescript
import { RealtimeWinnerService } from '@/lib/realtimeWinnerService'

// Setup monitoring when game starts
RealtimeWinnerService.setupWinnerMonitoring(gameId, (winner) => {
  // Handle winner found
  setWinner(winner)
  setShowWinnerModal(true)
})

// Cleanup when component unmounts
useEffect(() => {
  return () => RealtimeWinnerService.cleanup(gameId)
}, [gameId])
```

#### C. API Integration
Updated API endpoints:
- `/api/verify-winner` - Enhanced verification with database patterns
- `/api/validate-winner` - Uses new verification service

## Key Features

### 1. Database-Driven Patterns
- 15+ predefined winning patterns stored in database
- Configurable active patterns via game rules
- Priority-based pattern checking

### 2. Auto-Marking System
- Automatically marks called numbers on all player cards
- Database triggers handle real-time marking
- Tracks both manual and auto-marked positions

### 3. Real-time Verification
- Monitors called numbers and player actions
- Automatic winner detection
- Real-time notifications via Supabase subscriptions

### 4. Enhanced Winner Modal
- Shows actual winning pattern with highlighting
- Displays marked vs called numbers
- Database-driven pattern descriptions

## Configuration

### Game Rules (Configurable via Database)
```sql
-- Update active patterns
UPDATE game_rules 
SET rule_value = '["Top Row", "Bottom Row", "Main Diagonal", "Full House"]'
WHERE rule_name = 'active_patterns';

-- Update entry fee
UPDATE game_rules 
SET rule_value = '25'
WHERE rule_name = 'entry_fee_amount';

-- Enable multiple winners
UPDATE game_rules 
SET rule_value = 'true'
WHERE rule_name = 'multiple_winners_allowed';
```

### Custom Patterns
Add new winning patterns:
```sql
INSERT INTO winning_patterns (name, pattern_positions, description, priority) 
VALUES ('Custom Pattern', '{0,2,4,20,22,24}', 'Custom corner pattern', 2);
```

## Usage Examples

### Manual Winner Verification
```typescript
const result = await RealtimeWinnerService.verifyWinnerManually(gameId, cardNumber)
if (result.success && result.isWinner) {
  // Show winner modal
  setWinner(result.winner)
}
```

### Check Pattern Status
```typescript
const patternStatus = await RealtimeWinnerService.getPatternStatus(gameId, cardNumber)
// Shows completion percentage for each pattern
```

### Get Active Patterns
```typescript
const patterns = await WinningVerificationService.getActiveWinningPatterns()
// Returns all currently active patterns
```

## Database Tables

### winning_patterns
- Stores all available winning patterns
- Pattern positions as integer arrays (0-24)
- Priority and active status

### game_rules  
- Configurable game settings
- JSON values for complex rules
- Active/inactive status

### player_marked_numbers
- Tracks marked positions per player
- Separate arrays for manual and auto-marked
- Real-time updates via triggers

## Benefits

1. **Flexibility** - Easy to add/modify winning patterns
2. **Performance** - Database-optimized pattern checking
3. **Real-time** - Instant winner detection and notifications
4. **Accuracy** - Eliminates manual verification errors
5. **Scalability** - Handles multiple games and patterns efficiently

## Testing

Test the system by:
1. Creating a game with multiple players
2. Calling numbers and verifying auto-marking
3. Manually marking positions to test patterns
4. Verifying winner detection and modal display

## Troubleshooting

### Common Issues
1. **Auto-marking not working** - Check trigger is enabled
2. **Patterns not detected** - Verify active_patterns rule
3. **Real-time not updating** - Check Supabase subscriptions
4. **Winner modal not showing** - Verify callback setup

### Debug Queries
```sql
-- Check marked positions for a player
SELECT * FROM player_marked_numbers WHERE game_id = 'your-game-id';

-- Check active patterns
SELECT * FROM winning_patterns WHERE is_active = true;

-- Check game rules
SELECT * FROM game_rules WHERE is_active = true;
```

This system provides a robust, scalable foundation for bingo game winning verification with real-time capabilities and database-driven flexibility.