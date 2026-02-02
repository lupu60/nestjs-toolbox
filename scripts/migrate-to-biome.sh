#!/bin/bash

# Remove existing linting and formatting tools
npm uninstall eslint prettier @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-config-prettier

# Ensure Biome is installed
npm install -D @biomejs/biome

# Remove existing configuration files
rm -f .eslintrc* .prettierrc* eslint.config.js prettier.config.js

# Update package.json scripts
npm pkg set scripts.format="biome format --write packages/**/*.{ts,json}"
npm pkg set scripts.lint="biome lint packages/**/*.{ts,json}"
npm pkg set scripts.lint:fix="biome lint --fix packages/**/*.{ts,json}"

echo "Biome migration complete. Please review and commit the changes."