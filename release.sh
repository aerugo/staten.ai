#!/bin/bash
set -e

# Check if version argument is provided
if [ -z "$1" ]; then
    echo "Please provide a version number (e.g. ./release.sh 1.0.0)"
    exit 1
fi

# Check if rustup and required targets are installed
if ! command -v rustup &> /dev/null; then
  echo "Error: rustup is not installed. Please install rustup first."
  exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
  echo "Error: jq is not installed. Please install jq first."
  echo "On macOS: brew install jq"
  echo "On Ubuntu/Debian: sudo apt-get install jq"
  echo "On Fedora: sudo dnf install jq"
  exit 1
fi

# Check if the x86_64-apple-darwin target is installed
if ! rustup target list --installed | grep -q "x86_64-apple-darwin"; then
  echo "Installing x86_64-apple-darwin target..."
  rustup target add x86_64-apple-darwin
  if [ $? -ne 0 ]; then
    echo "Failed to install x86_64-apple-darwin target. Please install it manually with:"
    echo "rustup target add x86_64-apple-darwin"
    exit 1
  fi
  echo "x86_64-apple-darwin target installed successfully."
else
  echo "x86_64-apple-darwin target is already installed."
fi

# Check if the aarch64-apple-darwin target is installed
if ! rustup target list --installed | grep -q "aarch64-apple-darwin"; then
  echo "Installing aarch64-apple-darwin target..."
  rustup target add aarch64-apple-darwin
  if [ $? -ne 0 ]; then
    echo "Failed to install aarch64-apple-darwin target. Please install it manually with:"
    echo "rustup target add aarch64-apple-darwin"
    exit 1
  fi
  echo "aarch64-apple-darwin target installed successfully."
else
  echo "aarch64-apple-darwin target is already installed."
fi

VERSION=$1

# Ensure version starts with 'v'
if [[ $VERSION != v* ]]; then
    VERSION="v$VERSION"
fi

echo "Creating release for version $VERSION..."

# Update version in package.json
echo "Updating package.json..."
jq ".version = \"${VERSION#v}\"" package.json > tmp.json && mv tmp.json package.json

# Update version in Cargo.toml
echo "Updating Cargo.toml..."
sed -i '' "s/^version = \".*\"/version = \"${VERSION#v}\"/" src-tauri/Cargo.toml

# Update version in tauri.conf.json
echo "Updating tauri.conf.json..."
jq ".version = \"${VERSION#v}\"" src-tauri/tauri.conf.json > tmp.json && mv tmp.json src-tauri/tauri.conf.json

# Install dependencies and build frontend
echo "Installing dependencies..."
bun install

echo "Building frontend..."
bun run build

# Build Tauri app
echo "Building Tauri app..."
cd src-tauri
TAURI_SIGNING_PRIVATE_KEY=~/.tauri/staten cargo tauri build --target universal-apple-darwin

# Generate latest.json
echo "Generating latest.json..."
SIGNATURE=$(cat target/universal-apple-darwin/release/bundle/macos/Staten.app.tar.gz.sig)
cat > latest.json << EOL
{
    "version": "${VERSION#v}",
    "notes": "See the assets to download this version and install.",
    "pub_date": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "platforms": {
        "darwin-aarch64": {
            "signature": "$SIGNATURE",
            "url": "https://github.com/aerugo/staten.ai/releases/download/$VERSION/Staten.app.tar.gz"
        }
    }
}
EOL

# Define paths
APP_BUNDLE_PATH="target/universal-apple-darwin/release/bundle/macos/Staten.app"

# Check if .env file exists for signing credentials
if [ -f "../.env" ]; then
  echo "Loading environment variables from .env file..."
  set -a
  source "../.env"
  set +a
fi

# Check if signing is possible
if [ -n "$APPLE_SIGNING_IDENTITY" ] && [ -n "$APPLE_TEAM_ID" ]; then
  echo "Signing credentials found. Proceeding with app signing and notarization..."

  cd ..

  echo "Signing the app bundle using sign_app.sh..."
  ./sign_app.sh "src-tauri/$APP_BUNDLE_PATH"

  echo "Creating, signing, and notarizing the DMG using create_signed_dmg.sh..."
  ./create_signed_dmg.sh "src-tauri/$APP_BUNDLE_PATH" "src-tauri/target/universal-apple-darwin/release/bundle/dmg/Staten_${VERSION#v}_universal_signed.dmg"

  cd src-tauri
else
  echo "Signing credentials not found in .env file. Skipping app signing and notarization."
  echo "To enable signing, add APPLE_SIGNING_IDENTITY and APPLE_TEAM_ID to your .env file."
fi

# List the generated artifacts
echo "Generated artifacts:"
echo "-------------------"
echo "Latest update info: latest.json"
echo "DMG installer: $(ls target/universal-apple-darwin/release/bundle/dmg/*.dmg)"
echo "App archive: $(ls target/universal-apple-darwin/release/bundle/macos/*.app.tar.gz)"

# Return to the project root
cd ..

echo "Release process completed successfully!"

echo "Next steps:"
echo "1. Commit the version changes: git commit -am 'Bump version to ${VERSION#v}'"
echo "2. Create a git tag: git tag $VERSION"
echo "3. Push changes and tags: git push && git push --tags"
echo "4. Create a GitHub release with the generated artifacts"

git commit -am "Bump version to $VERSION"
git tag $VERSION
git push && git push --tags

cp src-tauri/target/universal-apple-darwin/release/bundle/dmg/Staten_${VERSION#v}_universal_signed.dmg src-tauri/target/universal-apple-darwin/release/bundle/dmg/Staten.dmg

gh release create $VERSION --title "Staten $VERSION" src-tauri/latest.json src-tauri/target/universal-apple-darwin/release/bundle/dmg/Staten.dmg src-tauri/target/universal-apple-darwin/release/bundle/macos/Staten.app.tar.gz
