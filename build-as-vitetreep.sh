#!/bin/bash

# Build script for ViteTreeP
# This script builds the VibeTree app and installs it as ViteTreeP in Applications

set -e  # Exit on error

echo "🔨 Building ViteTree desktop app..."
pnpm --filter @vibetree/desktop build

echo "📦 Packaging the app..."
pnpm --filter @vibetree/desktop package

echo "🗑️  Removing old ViteTreeP app if exists..."
rm -rf /Applications/ViteTreeP.app

echo "💿 Mounting DMG..."
hdiutil attach apps/desktop/release/VibeTree-0.0.1-arm64.dmg

echo "📋 Copying app to Applications as ViteTreeP..."
cp -R "/Volumes/VibeTree 0.0.1-arm64/VibeTree.app" /Applications/ViteTreeP.app

echo "💿 Unmounting DMG..."
hdiutil detach "/Volumes/VibeTree 0.0.1-arm64"

echo "✅ ViteTreeP has been successfully installed to /Applications/ViteTreeP.app"
echo "You can now launch ViteTreeP from your Applications folder!"