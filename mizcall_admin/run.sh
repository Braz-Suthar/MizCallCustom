#!/bin/bash

# MizCall Admin - Quick Run Script

echo "🚀 MizCall Admin Panel"
echo "======================"
echo ""

# Check if Flutter is installed
if ! command -v flutter &> /dev/null; then
    echo "❌ Flutter is not installed or not in PATH"
    echo "Please install Flutter: https://flutter.dev/docs/get-started/install"
    exit 1
fi

echo "✅ Flutter found: $(flutter --version | head -n 1)"
echo ""

# Get dependencies if needed
if [ ! -d ".dart_tool" ]; then
    echo "📦 Installing dependencies..."
    flutter pub get
    echo ""
fi

# Detect platform
PLATFORM=""
if [[ "$OSTYPE" == "darwin"* ]]; then
    PLATFORM="macos"
    echo "🍎 Detected macOS"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    PLATFORM="linux"
    echo "🐧 Detected Linux"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "win32" ]]; then
    PLATFORM="windows"
    echo "🪟 Detected Windows"
else
    echo "❓ Unknown platform: $OSTYPE"
    echo "Please run: flutter run -d <platform>"
    exit 1
fi

echo "🏃 Running on $PLATFORM..."
echo ""

# Run the app
flutter run -d $PLATFORM
