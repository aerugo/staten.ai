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

echo -e "${GREEN}Staten DMG Creation and Notarization Script${NC}"
echo "This script will create, sign, and notarize a DMG for your signed Staten app"
echo "------------------------------------------------------------"

# Check if APP_BUNDLE_PATH is provided
if [ -z "$1" ]; then
  echo -e "${RED}Error: Please provide the path to your signed Staten.app bundle${NC}"
  echo "Usage: $0 path/to/your/signed/Staten.app [output_dmg_path]"
  exit 1
fi

APP_BUNDLE_PATH="$1"
OUTPUT_DMG_PATH="$2"

# Check if APP_BUNDLE_PATH exists
if [ ! -d "$APP_BUNDLE_PATH" ]; then
  echo -e "${RED}Error: App bundle not found at $APP_BUNDLE_PATH${NC}"
  exit 1
fi

# Set default DMG path if not provided
if [ -z "$OUTPUT_DMG_PATH" ]; then
  APP_VERSION=$(defaults read "$APP_BUNDLE_PATH/Contents/Info.plist" CFBundleShortVersionString 2>/dev/null || echo "0.0.0")
  OUTPUT_DMG_PATH="./Staten_${APP_VERSION}_signed.dmg"
  echo -e "${YELLOW}No output DMG path provided. Using default: $OUTPUT_DMG_PATH${NC}"
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

if [ -z "$APPLE_ID" ] || [ -z "$APPLE_PASSWORD" ]; then
  echo -e "${RED}Error: Notarization requires APPLE_ID and APPLE_PASSWORD to be set${NC}"
  exit 1
fi

# Verify the app is properly signed before proceeding
echo -e "${GREEN}Verifying app signature before creating DMG...${NC}"
if ! codesign --verify --verbose "$APP_BUNDLE_PATH"; then
  echo -e "${RED}Error: App is not properly signed. Please sign it first with sign_app.sh${NC}"
  exit 1
fi

# Create a temporary directory for DMG creation
TEMP_DIR=$(mktemp -d)
echo -e "${GREEN}Creating temporary directory for DMG creation: $TEMP_DIR${NC}"

# Copy the app to the temporary directory
echo -e "${GREEN}Copying app to temporary directory...${NC}"
cp -R "$APP_BUNDLE_PATH" "$TEMP_DIR/"

# Create a symbolic link to /Applications in the temporary directory
echo -e "${GREEN}Creating symbolic link to /Applications...${NC}"
ln -s /Applications "$TEMP_DIR/Applications"

# Create the DMG
echo -e "${GREEN}Creating DMG...${NC}"
hdiutil create -volname "Staten" -srcfolder "$TEMP_DIR" -ov -format UDZO "$OUTPUT_DMG_PATH"

# Clean up temporary directory
echo -e "${GREEN}Cleaning up temporary directory...${NC}"
rm -rf "$TEMP_DIR"

# Sign the DMG
echo -e "${GREEN}Signing DMG...${NC}"
codesign --force --timestamp --sign "$APPLE_SIGNING_IDENTITY" "$OUTPUT_DMG_PATH"

# Verify the DMG signature
echo -e "${GREEN}Verifying DMG signature...${NC}"
codesign --verify --verbose "$OUTPUT_DMG_PATH"


echo -e "${GREEN}Submitting DMG for notarization...${NC}"

# Store the submission output in a variable
NOTARIZATION_OUTPUT=$(xcrun notarytool submit "$OUTPUT_DMG_PATH" \
  --apple-id "$APPLE_ID" \
  --password "$APPLE_PASSWORD" \
  --team-id "$APPLE_TEAM_ID" \
  --wait)

echo "$NOTARIZATION_OUTPUT"

# Extract the submission ID from the output
SUBMISSION_ID=$(echo "$NOTARIZATION_OUTPUT" | grep "id:" | head -1 | awk '{print $2}')

if [ -z "$SUBMISSION_ID" ]; then
  echo -e "${RED}Error: Could not extract submission ID from notarization output${NC}"
  echo -e "${RED}Skipping notarization status check and stapling${NC}"
else
  # Check notarization status with the extracted ID
  echo -e "${GREEN}Checking notarization status for ID: $SUBMISSION_ID${NC}"
  xcrun notarytool info "$SUBMISSION_ID" \
    --apple-id "$APPLE_ID" \
    --password "$APPLE_PASSWORD" \
    --team-id "$APPLE_TEAM_ID"
  
  # Get the status from the notarization output
  NOTARIZATION_STATUS=$(echo "$NOTARIZATION_OUTPUT" | grep "status:" | tail -1 | awk '{print $2}')
  
  if [ "$NOTARIZATION_STATUS" == "Accepted" ]; then
    # Staple the notarization ticket to the DMG
    echo -e "${GREEN}Stapling notarization ticket to DMG...${NC}"
    xcrun stapler staple "$OUTPUT_DMG_PATH"
    
    # Verify stapling
    echo -e "${GREEN}Verifying stapling...${NC}"
    xcrun stapler validate "$OUTPUT_DMG_PATH"
  else
    echo -e "${RED}Notarization was not successful. Status: $NOTARIZATION_STATUS${NC}"
    echo -e "${RED}Skipping stapling step.${NC}"
  fi
fi


echo -e "${GREEN}Process complete!${NC}"
echo -e "${GREEN}Generated artifacts:${NC}"
echo -e "-------------------"
echo -e "Signed DMG: ${YELLOW}$OUTPUT_DMG_PATH${NC}"
echo ""
echo -e "${GREEN}Distribution instructions:${NC}"
echo "1. Upload the signed (and notarized) DMG to your website or GitHub releases"
echo "2. Users can download and mount the DMG, then drag the app to their Applications folder" 