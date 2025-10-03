#!/bin/bash

# MongoDB Replica Set Keyfile Generator
# This script generates a secure keyfile for replica set authentication

set -e

KEYFILE_DIR="$(dirname "$0")"
KEYFILE_PATH="$KEYFILE_DIR/keyfile"

echo "Generating MongoDB replica set keyfile..."

# Generate a secure random keyfile (1024 bytes of base64-encoded random data)
openssl rand -base64 756 > "$KEYFILE_PATH"

# Set proper permissions (must be 400 or 600)
chmod 400 "$KEYFILE_PATH"

echo "✓ Keyfile generated successfully at: $KEYFILE_PATH"
echo ""
echo "IMPORTANT: Keep this keyfile secure!"
echo "- All replica set members must use the same keyfile"
echo "- Keyfile permissions must be 400 or 600"
echo "- Never commit this keyfile to version control"
echo ""
echo "To use with Docker, mount it as read-only:"
echo "  ./scripts/mongodb/keyfile:/etc/mongodb-keyfile:ro"
