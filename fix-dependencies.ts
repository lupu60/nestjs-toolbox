#!/usr/bin/env bun

import * as fs from 'fs';
import * as path from 'path';

const packagesDir = path.join(__dirname, 'packages');

function fixImports(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Fix import statements for problematic modules
  content = content.replace(/import \* as bunyanFormat from 'bunyan-format';/, "import bunyanFormat from 'bunyan-format';");
  content = content.replace(/import \* as colors from 'colors';/, "import colors from 'colors';");
  content = content.replace(/import \* as chalk from 'chalk';/, "import chalk from 'chalk';");
  
  // Fix TypeScript type assertions and remove extra semicolons
  content = content.replace(/= null;= null;/g, '= null;');
  content = content.replace(/= null;= {/g, '= {');
  content = content.replace(/,;/g, ',');
  
  // Ensure proper error handling for colors/chalk
  content = content.replace(/colors\.green\.bold/g, 'process.stdout.isTTY ? colors.green.bold : (x => x)');
  content = content.replace(/chalk\.magenta/g, 'process.stdout.isTTY ? chalk.magenta : (x => x)');

  fs.writeFileSync(filePath, content);
}

function traverseFiles(dir: string) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      traverseFiles(fullPath);
    } else if (file.endsWith('.ts') && !file.includes('.spec.')) {
      fixImports(fullPath);
    }
  }
}

// Fix package-level import issues
const packageJsonFiles = [
  'packages/bunyan-logger/package.json',
  'packages/http-logger-middleware/package.json',
  'packages/bootstrap-log/package.json',
  'packages/progress-bar/package.json'
];

packageJsonFiles.forEach(jsonFile => {
  const fullPath = path.join(__dirname, jsonFile);
  const packageJson = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
  
  // Add or update missing dependencies
  packageJson.dependencies = packageJson.dependencies || {};
  packageJson.dependencies['bunyan-format'] = packageJson.dependencies['bunyan-format'] || '^0.2.1';
  packageJson.dependencies['colors'] = packageJson.dependencies['colors'] || '^1.4.0';
  packageJson.dependencies['chalk'] = packageJson.dependencies['chalk'] || '^5.3.0';

  fs.writeFileSync(fullPath, JSON.stringify(packageJson, null, 2));
});

// Traverse and fix import issues
traverseFiles(packagesDir);

console.log('Dependency and import fixes applied successfully.');