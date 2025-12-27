#!/bin/bash
# Build script that runs from workspace root
# Usage: ./build.sh

cd "$(dirname "$0")/.."
echo "Building from workspace root: $(pwd)"
cargo odra build
