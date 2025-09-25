# Real-time Bingo System

A complete real-time multiplayer bingo system with live number calling and green highlighting of called numbers.

## Features

✅ **Real-time Database Updates** - All game state changes are synchronized across all clients
✅ **Green Number Highlighting** - Called numbers are marked green on the bingo board
✅ **Current Number Display** - Shows the current called number with animation
✅ **Live Game Status** - Real-time updates of players, pot, and game progress
✅ **Automatic Number Calling** - 6-second intervals with database synchronization
✅ **Multi-tenant Support** - Supports multiple game instances with tenant isolation

## Setup Instructions

### 1. Deploy Database Functions

Run the deployment script in your Supabase SQL editor:

```sql
-- Copy and paste the contents of deploy-realtime-system.sql
```

### 2. Enable Real-time

The system automatically enables real-time subscriptions for:
- `games` table - Game status and current number updates
- `players` table - Player joins and winner declarations  
- `called_numbers` table - New number calls

### 3. Test the System

Use the development test panel in the admin interface to verify:
- Number calling works with proper timing
- Real-time updates are received
- Game status is synchronized

## How It Works

### Real-time Number Calling

```typescript
// Numbers are called every 6 seconds with database synchronization
const result = await supabase.rpc('call_next_number_realtime', {
  game_uuid: gameId,
  p_tenant_id: tenantId || null
})
```

### Live Status Updates

```typescript
// Game status updates in real-time
const status = await supabase.rpc('get_realtime_game_status', {
  game_uuid: gameId,
  p_tenant_id: tenantId || null
})
```

### Green Number Highlighting

Numbers are highlighted based on their status:
- **Green with pulse animation** - Current number being called
- **Green solid** - Previously called numbers
- **Gray** - Not yet called

## Components

### RealtimeBingoBoard
Main component that displays:
- Live game status panel
- BINGO number board with green highlighting
- Real-time player count and pot updates

### RealtimeTestPanel (Development)
Testing interface for:
- Manual number calling
- Status checking
- Game reset functionality

## Database Functions

### call_next_number_realtime()
- Enforces 6-second calling intervals
- Prevents duplicate calls
- Updates game state atomically
- Returns number with BINGO letter

### get_realtime_game_status()
- Returns complete game status
- Calculates pot and prizes
- Counts players and called numbers
- Supports tenant filtering

### reset_game_realtime()
- Clears all game data
- Resets game status
- Maintains data integrity

## Real-time Subscriptions

The system uses Supabase real-time subscriptions:

```typescript
// Game updates
supabase.channel('game_updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public', 
    table: 'games'
  }, handleGameUpdate)

// Number calls
supabase.channel('number_calls')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'called_numbers'
  }, handleNumberCall)
```

## Usage

### Player View
- Navigate to `/game/[gameId]` to see the real-time board
- Numbers turn green as they're called
- Current number pulses with animation
- Game status updates live

### Admin View  
- Use `/admin` for game management
- Start/pause games with real-time sync
- Verify winners with live validation
- Monitor all game activity

### Multi-tenant
- Add `?tenant=TENANT_ID` to URLs for tenant isolation
- Each tenant has separate game state
- Real-time updates are tenant-filtered

## Performance

- **Database indexes** optimize real-time queries
- **6-second intervals** prevent system overload  
- **Atomic operations** ensure data consistency
- **Efficient subscriptions** minimize bandwidth

## Troubleshooting

### Numbers Not Updating
1. Check Supabase real-time is enabled
2. Verify database functions are deployed
3. Check browser console for subscription errors

### Timing Issues
- Database enforces 6-second intervals
- Wait messages are normal behavior
- Check automatic caller status

### Multi-tenant Problems
- Ensure tenant_id is passed correctly
- Verify tenant filtering in subscriptions
- Check database function parameters

## API Endpoints

### /api/realtime-test
Test endpoint for development:
- `POST` with `{ gameId, action, tenantId }`
- Actions: `call_number`, `get_status`, `reset_game`

## Development

The system includes development tools:
- Real-time test panel in admin interface
- Console logging for debugging
- API test endpoints
- Status monitoring

## Production Deployment

1. Run `deploy-realtime-system.sql` in production Supabase
2. Enable real-time in Supabase dashboard
3. Configure environment variables
4. Test with multiple clients
5. Monitor performance and scaling

## Security

- Row Level Security (RLS) enabled
- Function permissions granted to authenticated users
- Tenant isolation enforced at database level
- Real-time subscriptions filtered by permissions