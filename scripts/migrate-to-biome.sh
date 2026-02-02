#!/bin/bash

# Remove ESLint and Prettier configuration files
find . -name ".eslintrc*" -delete
find . -name ".prettierrc*" -delete

# Migrate package.json scripts
echo "Migrating package.json scripts to use Biome..."

# Format all TypeScript and JSON files in packages directory
biome format --write packages/**/*.{ts,json}

# Lint all TypeScript and JSON files in packages directory
biome lint packages/**/*.{ts,json}

echo "Biome migration complete!"