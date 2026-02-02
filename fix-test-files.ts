#!/usr/bin/env bun

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { glob } from 'glob';
import * as path from 'path';

function fixTestFile(filePath: string) {
  try {
    let content = readFileSync(filePath, 'utf-8');

    // Add missing semicolons
    content = content.replace(/(\w+)\s*:\s*(\w+)\s*(?=\[|\{|=)/g, '$1: $2;');

    // Add initialization for type declarations
    content = content.replace(/(\w+)\s*:\s*(\w+)\s*(?=;|\n)/g, '$1: $2 = null');

    // Ensure semicolons at the end of lines
    content = content.replace(/([^;{}\n])\s*(\n|\r\n)/g, '$1;$2');

    // Remove multiple consecutive semicolons
    content = content.replace(/;;+/g, ';');

    writeFileSync(filePath, content);
    console.log(`Fixed: ${filePath}`);
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error);
  }
}

async function main() {
  const packages = await glob('/home/wlf/workspace/nestjs-toolbox/packages/*/src/test/**/*.spec.ts');
  
  packages.forEach(fixTestFile);
}

main().catch(console.error);