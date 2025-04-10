#!/bin/bash
set -e

if [ -f .env ]; then
  echo "Loading environment variables from .env file..."

  set -a
  source .env
  set +a
fi

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

echo -e "${GREEN}Staten App Signing Script${NC}"
echo "This script will properly sign your Staten app for notarization"
echo "------------------------------------------------------------"

# Display the current signing identity
echo -e "${YELLOW}Current APPLE_SIGNING_IDENTITY: ${APPLE_SIGNING_IDENTITY}${NC}"

# List available signing identities
echo -e "\n${YELLOW}Available signing identities in your keychain:${NC}"
security find-identity -v -p codesigning

echo -e "\n${GREEN}You should use one of the identities listed above.${NC}"
echo -e "Update your .env file with the exact identity string or continue with the current one.\n"

# Check if APP_BUNDLE_PATH is provided
if [ -z "$1" ]; then
  echo -e "${RED}Error: Please provide the path to your Staten.app bundle${NC}"
  echo "Usage: $0 path/to/your/Staten.app"
  exit 1
fi

APP_BUNDLE_PATH="$1"

# Check if APP_BUNDLE_PATH exists
if [ ! -d "$APP_BUNDLE_PATH" ]; then
  echo -e "${RED}Error: App bundle not found at $APP_BUNDLE_PATH${NC}"
  exit 1
fi

# Check for required environment variables
if [ -z "$APPLE_SIGNING_IDENTITY" ]; then
  echo -e "${RED}Error: APPLE_SIGNING_IDENTITY environment variable not set${NC}"
  exit 1
fi

if [ -z "$APPLE_TEAM_ID" ]; then
  echo -e "${RED}Error: APPLE_TEAM_ID environment variable not set${NC}"
  exit 1
fi

ENTITLEMENTS_PATH="./src-tauri/macos/entitlements.plist"
if [ ! -f "$ENTITLEMENTS_PATH" ]; then
  echo -e "${YELLOW}Warning: Entitlements file not found at $ENTITLEMENTS_PATH${NC}"
  echo -e "Creating a basic entitlements file..."
  
  # Create a basic entitlements file
  cat > "$ENTITLEMENTS_PATH" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
    <key>com.apple.security.network.client</key>
    <true/>
</dict>
</plist>
EOF
  echo -e "${GREEN}Created entitlements file at $ENTITLEMENTS_PATH${NC}"
fi

# First, remove any existing signatures
echo -e "${GREEN}Removing any existing signatures...${NC}"
codesign --remove-signature "$APP_BUNDLE_PATH" || true

# Sign all dylibs and frameworks first (working from inside out)
echo -e "${GREEN}Signing embedded libraries and frameworks...${NC}"

# Find and sign all dylibs
find "$APP_BUNDLE_PATH" -type f -name "*.dylib" | while read -r lib; do
  echo "Signing $lib"
  codesign --force --options runtime --timestamp --sign "$APPLE_SIGNING_IDENTITY" "$lib"
done

# Find and sign all .so files
find "$APP_BUNDLE_PATH" -type f -name "*.so" | while read -r lib; do
  echo "Signing $lib"
  codesign --force --options runtime --timestamp --sign "$APPLE_SIGNING_IDENTITY" "$lib"
done

# Find and sign all frameworks
find "$APP_BUNDLE_PATH" -type d -name "*.framework" | while read -r framework; do
  echo "Signing framework $framework"
  codesign --force --options runtime --timestamp --sign "$APPLE_SIGNING_IDENTITY" "$framework"
done

# Sign the main executable with hardened runtime
echo -e "${GREEN}Signing Staten.app main executable with hardened runtime...${NC}"
codesign --force --options runtime --timestamp --sign "$APPLE_SIGNING_IDENTITY" \
  --entitlements "$ENTITLEMENTS_PATH" "$APP_BUNDLE_PATH/Contents/MacOS/staten"

# Verify the main executable signature
echo -e "${GREEN}Verifying main executable signature...${NC}"
codesign --verify --verbose "$APP_BUNDLE_PATH/Contents/MacOS/staten"

# Sign the entire app bundle
echo -e "${GREEN}Signing complete Staten.app with hardened runtime...${NC}"
codesign --force --deep --options runtime --timestamp --sign "$APPLE_SIGNING_IDENTITY" \
  --entitlements "$ENTITLEMENTS_PATH" "$APP_BUNDLE_PATH"

# Verify the app bundle signature
echo -e "${GREEN}Verifying app bundle signature...${NC}"
codesign --verify --verbose "$APP_BUNDLE_PATH"

echo -e "${GREEN}App signing complete!${NC}"
echo -e "${YELLOW}Now you can create a DMG with this signed app and notarize it.${NC}"
echo -e "${GREEN}Next steps:${NC}"
echo "1. Create a DMG with the signed app"
echo "2. Sign the DMG with: codesign --force --timestamp --sign \"$APPLE_SIGNING_IDENTITY\" your_dmg.dmg"
echo "3. Notarize the DMG with: xcrun notarytool submit your_dmg.dmg --apple-id \"your_apple_id\" --password \"your_password\" --team-id \"your_team_id\" --wait"
echo "4. Staple the ticket with: xcrun stapler staple your_dmg.dmg" 