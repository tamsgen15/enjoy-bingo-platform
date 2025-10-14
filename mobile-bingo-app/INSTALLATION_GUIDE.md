# Mobile Bingo Cards - Installation Guide

## For Tenant/Admin

### Building the APK

1. **Prerequisites**:
   - Install Node.js from https://nodejs.org
   - Install Android Studio from https://developer.android.com/studio
   - Install Java JDK 11 or higher

2. **Build Process**:
   ```bash
   # Navigate to mobile-bingo-app folder
   cd mobile-bingo-app
   
   # Run the build script (Windows)
   build-apk.bat
   
   # OR manually:
   npm install
   cd android
   gradlew assembleRelease
   ```

3. **APK Location**: 
   - Find the APK at: `android/app/build/outputs/apk/release/app-release.apk`
   - File size: ~10-15MB

### Distributing to Players

1. **Share APK**: Send the `app-release.apk` file to players via:
   - WhatsApp/Telegram
   - Email attachment
   - USB transfer
   - Cloud storage (Google Drive, Dropbox)

2. **Installation Instructions for Players**:
   - Enable "Install from Unknown Sources" in Android settings
   - Download and tap the APK file to install
   - App name will appear as "ENJOY BINGO"

## For Players

### Installing the App

1. **Download**: Get the APK file from your bingo admin
2. **Enable Installation**: 
   - Go to Settings > Security > Unknown Sources (Enable)
   - OR Settings > Apps > Special Access > Install Unknown Apps
3. **Install**: Tap the APK file and follow prompts
4. **Open**: Find "ENJOY BINGO" in your app drawer

### Using the App

1. **Select Cards**: 
   - Choose 1-4 cards from the 100 available
   - Remember your card numbers

2. **Tell Admin**: 
   - Inform the admin of your selected card numbers
   - Admin will assign these same cards in the system

3. **During Game**:
   - Listen for called numbers
   - Tap numbers on your cards to mark them
   - Cards are saved automatically

4. **Winning**:
   - When you have a winning pattern, tap "CALL BINGO!"
   - Shout "BINGO!" loudly to claim your prize
   - Tell admin your card numbers for verification

### App Features

- ✅ Works offline (no internet needed during play)
- ✅ Saves your cards and marks automatically
- ✅ Up to 4 cards at once
- ✅ Same cards as physical printed versions
- ✅ Easy tap-to-mark interface
- ✅ Responsive design for all phone sizes

### Troubleshooting

**App won't install?**
- Check if "Unknown Sources" is enabled
- Make sure you have enough storage space
- Try redownloading the APK file

**Cards not showing?**
- Close and reopen the app
- Clear app data in Android settings if needed

**Lost your marked numbers?**
- The app saves automatically, but you can tap "Clear Marks" to start over

### Support

Contact your bingo admin for:
- APK file updates
- Technical support
- Game rules and schedules