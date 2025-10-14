# Call Interval Control Feature

## Overview
Added manual control for auto-number calling interval (0-10 seconds) per tenant admin.

## Features
- **Adjustable Speed**: 0-10 seconds between calls
- **Real-time Update**: Changes apply immediately to active games
- **Per-Tenant**: Each tenant can set their own interval
- **Persistent**: Saved in database for each game

## UI Location
Admin Control Panel → Game Controls section → "⏱️ Call Interval" input

## How It Works

### 1. Database
```sql
-- New column in games table
call_interval_seconds INTEGER DEFAULT 6
```

### 2. Backend
- `TenantAutomaticNumberCaller` supports dynamic intervals
- `updateCallInterval()` changes speed without restarting
- Interval stored per game session

### 3. Frontend
- Input field (0-10 seconds)
- "Apply" button updates both database and active caller
- Shows current interval in real-time

## Usage

### For Admin:
1. Start a game
2. Adjust "Call Interval" slider (0-10 seconds)
3. Click "Apply"
4. Numbers now call at new speed

### Interval Guide:
- **0 seconds**: Instant calling (very fast)
- **3 seconds**: Fast game
- **6 seconds**: Default (balanced)
- **10 seconds**: Slow game (more time to mark)

## Technical Details

### Files Modified:
1. `supabase/add_call_interval_column.sql` - Database schema
2. `src/lib/TenantAutomaticNumberCaller.ts` - Dynamic interval support
3. `src/app/admin/page.tsx` - UI controls
4. `src/lib/databaseService.ts` - GameState type

### API:
```typescript
// Start with custom interval
tenantAutomaticNumberCaller.startTenantGame(gameId, tenantId, 3) // 3 seconds

// Update interval during game
tenantAutomaticNumberCaller.updateCallInterval(tenantId, 8) // Change to 8 seconds
```

## Deployment Steps

1. **Run SQL**:
   ```sql
   -- In Supabase SQL Editor
   ALTER TABLE games ADD COLUMN IF NOT EXISTS call_interval_seconds INTEGER DEFAULT 6;
   UPDATE games SET call_interval_seconds = 6 WHERE call_interval_seconds IS NULL;
   ```

2. **Deploy Code**: Already updated in admin page

3. **Test**: 
   - Create new game
   - Adjust interval
   - Verify numbers call at new speed

## Benefits
- ✅ Flexible game speed per tenant
- ✅ Accommodates different player speeds
- ✅ Real-time adjustment without restart
- ✅ Better user experience
- ✅ Saved per game session