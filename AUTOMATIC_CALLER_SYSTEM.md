# Automatic Number Calling System

## Overview

The new automatic number calling system has been completely redesigned to provide:

- **Fully Automatic Operation**: No manual "Call Next Number" button
- **Perfect 3-Second Intervals**: Consistent timing between number calls
- **Synchronized Voice**: No overlapping or delayed voice announcements
- **Proper Game Flow**: "Game Started" announcement followed by number calling
- **Queue Management**: Prevents audio overlapping and ensures sequential playback

## Key Features

### 1. AutomaticNumberCaller Class
- Singleton pattern ensures only one caller instance
- Manages game state and calling intervals
- Handles voice synchronization
- Prevents overlapping calls

### 2. Enhanced Voice System
- Queue-based audio playback
- Prevents overlapping voice announcements
- Proper timing between letter and number
- Clean audio transitions

### 3. Database Integration
- Uses enhanced `call_next_number` function
- Proper locking to prevent duplicate calls
- Real-time synchronization
- Error handling and recovery

## System Flow

1. **Game Creation**: Admin creates new game
2. **Player Assignment**: Players are assigned cards (1-100)
3. **Game Start**: Admin clicks "Start Game"
   - System announces "Game Started" (1 second delay)
   - Waits 2 additional seconds before first number
4. **Automatic Calling**: Every 3 seconds exactly:
   - Database function selects random available number
   - Number is inserted into database
   - Real-time update triggers voice announcement
   - Voice plays letter + number with proper timing
5. **Game End**: Automatically stops when all 75 numbers called

## Technical Implementation

### AutomaticNumberCaller
```typescript
// Start automatic calling
automaticNumberCaller.startGame(gameId)

// Stop calling
automaticNumberCaller.stopGame()

// Pause/Resume
automaticNumberCaller.pauseGame()
automaticNumberCaller.resumeGame()
```

### Voice Synchronization
- Queue-based system prevents overlapping
- 300ms delay between letter and number
- Proper cleanup of audio resources
- Error handling for missing audio files

### Database Function
- Advisory locks prevent race conditions
- Unique constraints prevent duplicates
- Proper error handling and reporting
- Real-time updates for UI synchronization

## Configuration

### Timing Settings
- **Game Start Delay**: 1 second
- **Pre-Call Delay**: 2 seconds after game start
- **Call Interval**: 3 seconds between numbers
- **Letter-Number Gap**: 300ms

### Audio Settings
- **Volume**: 90%
- **Preload**: All audio files loaded on startup
- **Format**: MP3 files in `/public/audio/amharic/`

## File Structure

```
src/lib/
├── AutomaticNumberCaller.ts    # Main caller system
├── OfflineAmharicTTS.ts        # Enhanced voice system
├── databaseService.ts          # Database integration
└── RealtimeGameContext.tsx     # Updated context

src/components/
└── AutoCallerStatus.tsx        # Status indicator

supabase/
└── fixed_migration.sql         # Enhanced database function
```

## Audio Files Required

Place these files in `/public/audio/amharic/`:
- `game-started.mp3`
- `b.mp3`, `i.mp3`, `n.mp3`, `g.mp3`, `o.mp3`
- `1.mp3` through `75.mp3`

## Admin Interface Changes

### Removed Features
- ❌ "Call Next Number" button (fully automatic now)
- ❌ Manual calling controls
- ❌ Call interval settings

### Added Features
- ✅ Auto Caller Status indicator
- ✅ Real-time calling progress
- ✅ Automatic game flow management

## Error Handling

### Common Issues
1. **Audio Files Missing**: Falls back to speech synthesis
2. **Database Locks**: Queues calls to prevent conflicts
3. **Network Issues**: Automatic retry with exponential backoff
4. **Game State Conflicts**: Proper cleanup and state management

### Recovery Mechanisms
- Automatic retry for failed calls
- Queue management for overlapping requests
- Proper cleanup on game end/reset
- Error logging for debugging

## Performance Optimizations

1. **Audio Preloading**: All files loaded at startup
2. **Database Locking**: Prevents duplicate calls
3. **Queue Management**: Efficient audio playback
4. **Memory Management**: Proper cleanup of resources

## Testing Checklist

- [ ] Game starts with proper "Game Started" announcement
- [ ] First number called 3 seconds after game start
- [ ] Subsequent numbers called every 3 seconds
- [ ] No overlapping voice announcements
- [ ] Proper letter-number pronunciation
- [ ] Game stops automatically at 75 numbers
- [ ] Pause/resume functionality works
- [ ] Multiple games don't interfere
- [ ] Audio quality is clear and consistent
- [ ] Real-time updates work properly

## Troubleshooting

### No Voice Announcements
1. Check audio files in `/public/audio/amharic/`
2. Verify browser audio permissions
3. Check console for audio loading errors

### Timing Issues
1. Verify AutomaticNumberCaller is active
2. Check for JavaScript errors in console
3. Ensure proper game state management

### Database Issues
1. Run the migration script
2. Check Supabase function permissions
3. Verify real-time subscriptions

## Migration from Old System

1. **Remove Manual Controls**: Old calling buttons removed
2. **Update Context**: RealtimeGameContext updated
3. **Database Migration**: Run `fixed_migration.sql`
4. **Audio Setup**: Ensure all audio files present
5. **Testing**: Verify complete game flow

The system is now fully automatic and provides a smooth, professional bingo calling experience with perfect timing and voice synchronization.