#!/bin/bash

# A `.command` file runs in a basic non-interactive shell.
# We source the user's profile to load `nvm` or other custom PATHs (like Homebrew).
if [ -f "$HOME/.bash_profile" ]; then
    source "$HOME/.bash_profile"
fi
if [ -f "$HOME/.zshrc" ]; then
    source "$HOME/.zshrc"
fi

# Add common Mac paths just in case
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

# Change to the directory where this script is located
cd "$(dirname "$0")"

echo "Starting Quarry Miner..."

# If dependencies are not installed yet, install them
if [ ! -d "node_modules" ]; then
    echo "First time running: Installing dependencies (this may take a minute)..."
    npm install
fi

# Start the application using npm
echo "Starting development server and opening browser..."
# Try to open the browser in the background once the server is ready
(
  # Wait up to 30 seconds for the server to be ready
  for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null; then
      open http://localhost:3000
      break
    fi
    sleep 1
  done
) &

npm run dev
