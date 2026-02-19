@echo off
REM Helper script for Windows to ensure build runs from correct directory

REM Change to the directory where this script is located
cd /d "%~dp0"

REM Verify we're in the right place
if not exist "package.json" (
    echo ❌ Error: package.json not found!
    echo Please run this script from the mobile directory
    exit /b 1
)

if not exist "app.json" (
    echo ❌ Error: app.json not found!
    echo Please run this script from the mobile directory
    exit /b 1
)

echo ✅ Verified: Running from mobile directory
echo 📦 Starting EAS build...

REM Run the build with the provided profile (default: preview)
set PROFILE=%1
if "%PROFILE%"=="" set PROFILE=preview

npx eas-cli build --platform android --profile %PROFILE%
