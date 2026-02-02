#!/bin/bash

# Remove ESLint and Prettier configuration files
find . -name ".eslintrc*" -delete
find . -name ".prettierrc*" -delete
find . -name "prettier.config.*" -delete
find . -name ".prettierignore" -delete

# Remove Prettier references from package.json and configs
find . -type f \( -name "package.json" -o -name ".eslintrc*" \) -print0 | xargs -0 sed -i 's/prettier//g'
find . -type f \( -name "package.json" -o -name ".eslintrc*" \) -print0 | xargs -0 sed -i '/prettier/d'

# Remove Prettier-related GitHub workflows
find .github/workflows -type f | xargs grep -l "prettier" | xargs rm

# Format all TypeScript and JSON files in packages directory
biome format --write packages/**/*.{ts,json}

# Lint all TypeScript and JSON files in packages directory
biome lint packages/**/*.{ts,json}

echo "Biome migration complete! All Prettier traces removed."