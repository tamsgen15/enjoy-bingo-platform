# Mobile Bingo Cards APK

A simple Android app for bingo players to use their phones instead of physical printed cards.

## Features

- Select 1-4 bingo cards from 100 available cards (same as printable_cards)
- Interactive card marking - tap numbers to mark/unmark
- Offline functionality - works without internet
- Compact 2-column layout for up to 4 cards
- Card size: 140x190px equivalent responsive design
- Save/restore selected cards and marked numbers
- "CALL BINGO!" button for claiming prizes

## How It Works

1. **Card Selection**: Player selects preferred card numbers (1-100)
2. **Admin Assignment**: Player tells admin their selected card numbers
3. **Game Play**: Admin assigns same cards in the platform system
4. **Marking**: Player marks numbers on phone as they're called
5. **Winning**: Player manually shouts "BINGO!" to claim prize
6. **Verification**: Admin verifies using the card numbers player selected

## Build Instructions

### Prerequisites
- Node.js 16+
- React Native CLI
- Android Studio
- Java JDK 11+

### Setup
```bash
# Install dependencies
npm install

# For Android development
npx react-native run-android

# Build APK
cd android
./gradlew assembleRelease
```

### APK Location
After building, the APK will be located at:
`android/app/build/outputs/apk/release/app-release.apk`

## Usage Instructions

1. **Install APK** on player's phone
2. **Select Cards**: Choose 1-4 cards from available options
3. **Tell Admin**: Inform admin of selected card numbers for assignment
4. **Play Game**: Mark numbers as they're called during the game
5. **Call Bingo**: Tap "CALL BINGO!" button and shout to claim prize
6. **Verification**: Tell admin your card numbers for verification

## Technical Details

- **Framework**: React Native
- **Storage**: AsyncStorage for offline data persistence
- **Cards Data**: Pre-generated 100 cards matching database
- **Layout**: Responsive 2-column grid for multiple cards
- **Size**: Optimized for mobile screens with 140x190px card equivalent

## Card Data Source

The app uses the same bingo card data as the main platform's `printable_cards` and database `bingo_cards` table, ensuring consistency between physical and digital cards.

## Deployment

1. Build the APK using the instructions above
2. Distribute the APK file to players
3. Players install and use alongside the main bingo platform
4. Admin manages game through the main web platform as usual