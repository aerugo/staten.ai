#!/bin/bash
set -e

# Define cleanup function
cleanup() {
    # Get exit code
    EXIT_CODE=$?

    # If installation failed, clean up the cloned repository
    if [ $EXIT_CODE -ne 0 ]; then
        echo "Installation failed with exit code $EXIT_CODE"
        echo "Cleaning up..."
        if [ -d "$SCRIPT_DIR/fleur" ]; then
            rm -rf "$SCRIPT_DIR/fleur"
        fi
    fi

    exit $EXIT_CODE
}

# Set trap to call cleanup function on exit
trap cleanup EXIT

# Store original directory to properly handle paths
SCRIPT_DIR="$(pwd)"

echo "Installing Fleur from source..."

# Check if curl is available (it should be on all macOS systems by default)
if ! command -v curl &> /dev/null; then
    echo "Error: curl is not installed. It should be available on macOS by default."
    exit 1
fi

# Install Homebrew if not already installed
if ! command -v brew &> /dev/null; then
    echo "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

    # Add Homebrew to PATH based on processor type
    if [[ $(uname -m) == "arm64" ]]; then
        # For Apple Silicon
        eval "$(/opt/homebrew/bin/brew shellenv)"
    else
        # For Intel Macs
        eval "$(/usr/local/bin/brew shellenv)"
    fi
else
    echo "Homebrew is already installed."
fi

# Install Git if not already installed
if ! command -v git &> /dev/null; then
    echo "Installing Git using Homebrew..."
    brew install git
else
    echo "Git is already installed."
fi

# Install Rust if not already installed
if ! command -v rustc &> /dev/null; then
    echo "Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    # Source the cargo environment within this script
    source "$HOME/.cargo/env"
else
    echo "Rust is already installed."
fi

# Ensure Cargo is in PATH regardless of how Rust was installed
export PATH="$HOME/.cargo/bin:$PATH"

# Install Bun using Homebrew instead of curl
if ! command -v bun &> /dev/null; then
    echo "Installing Bun using Homebrew..."
    brew tap oven-sh/bun
    brew install bun

    # Verify installation
    if ! command -v bun &> /dev/null; then
        echo "Error: Bun installation failed. Please install manually with 'brew install bun'"
        exit 1
    fi
else
    echo "Bun is already installed."
fi

# Clean up any existing fleur directory in the current working directory
echo "Cleaning up any previous installation attempts..."
if [ -d "./fleur" ]; then
    rm -rf "./fleur"
fi

# Clone the repository
echo "Cloning Fleur repository..."
git clone https://github.com/fleuristes/fleur
cd fleur

# Install dependencies with Bun
echo "Installing project dependencies with Bun..."
bun install

# Install Tauri CLI through Cargo (explicitly)
echo "Installing Tauri CLI..."
cargo install tauri-cli --version "^2.0.0" || echo "Tauri CLI installation skipped (might already be installed)"

# Build with Tauri using bunx to ensure correct path
echo "Building Fleur with Tauri (this may take a while)..."
cd src-tauri
bunx tauri build || (
    echo "Trying alternative build method..."
    # Try with cargo directly as fallback
    cargo tauri build
)

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "Build complete!"
    echo "Fleur has been successfully installed."
else
    echo "Build failed."
    echo "Cleaning up..."
    cd "$SCRIPT_DIR"
    rm -rf "./fleur"
    exit 1
fi
