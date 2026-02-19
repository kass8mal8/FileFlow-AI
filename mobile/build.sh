#!/bin/bash
# Helper script to ensure build runs from correct directory

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Change to mobile directory
cd "$SCRIPT_DIR"

# Verify we're in the right place
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found!"
    echo "Please run this script from the mobile directory"
    exit 1
fi

if [ ! -f "app.json" ]; then
    echo "❌ Error: app.json not found!"
    echo "Please run this script from the mobile directory"
    exit 1
fi

echo "✅ Verified: Running from mobile directory"
echo "📦 Starting EAS build..."

# Run the build with the provided profile (default: preview)
PROFILE=${1:-preview}
npx eas-cli build --platform android --profile "$PROFILE"
