@echo off
echo Building Mobile Bingo APK...
echo.

echo Step 1: Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo Error installing dependencies
    pause
    exit /b 1
)

echo.
echo Step 2: Building Android APK...
cd android
call gradlew assembleRelease
if %errorlevel% neq 0 (
    echo Error building APK
    pause
    exit /b 1
)

echo.
echo ✅ APK built successfully!
echo Location: android\app\build\outputs\apk\release\app-release.apk
echo.
echo You can now distribute this APK to bingo players.
pause