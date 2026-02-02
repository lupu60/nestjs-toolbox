#!/usr/bin/env bun

import * as fs from 'fs';
import * as path from 'path';

const packagesDir = path.join(__dirname, 'packages');

function generateTest(packageName: string, srcFile: string, testFile: string) {
  const srcPath = path.join(packagesDir, packageName, 'src', srcFile);
  const testPath = path.join(packagesDir, packageName, 'src', 'test', testFile);
  
  // Ensure test directory exists
  fs.mkdirSync(path.dirname(testPath), { recursive: true });

  let testContent = '';

  switch (packageName) {
    case 'access-control':
      testContent = `
import { Test, TestingModule } from '@nestjs/testing';
import { AccessControlModule } from '../access.control.module';

describe('AccessControlModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AccessControlModule.forRoot({ grantsEndpoint: true })]
    }).compile();
  });

  it('should create module with grants endpoint', () => {
    const accessControlModule = module.get(AccessControlModule);
    expect(accessControlModule).toBeDefined();
  });
});
`;
      break;

    case 'open-api-spec-to-ts':
      testContent = `
import { OpenAPISpecParser } from '../lib/spec-parser';
import * as fs from 'fs';
import * as path from 'path';

describe('OpenAPISpecParser Extended Tests', () => {
  const validSpecPath = path.join(__dirname, 'fixtures', 'valid-spec.json');
  
  beforeEach(() => {
    // Create a sample valid spec file
    fs.writeFileSync(validSpecPath, JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {}
    }));
  });

  afterEach(() => {
    // Clean up test file
    if (fs.existsSync(validSpecPath)) {
      fs.unlinkSync(validSpecPath);
    }
  });

  it('should handle spec with no components', () => {
    const parser = new OpenAPISpecParser(validSpecPath);
    const result = parser.parse();
    expect(result).toBeDefined();
    expect(result.components).toBeUndefined();
  });
});
`;
      break;

    case 'version-generator':
      testContent = `
import { 
  generate_version, 
  generate_feature_version, 
  generate_develop_version, 
  generate_master_version,
  isDevelop,
  isFeature,
  isMaster
} from '../lib/lib';

describe('Version Generator Extended Tests', () => {
  it('should generate version with context', () => {
    const version = generate_version('1.2.3', 'feature', { branch: 'test-feature' });
    expect(version).toMatch(/^1\.2\.3-feature\.\d+/);
  });

  it('should handle edge cases in version generation', () => {
    expect(() => generate_version('', 'feature')).toThrow();
    expect(() => generate_version('1.2.3', '')).toThrow();
  });
});
`;
      break;

    // Add similar extended test cases for other packages
    default:
      testContent = `
describe('Extended Tests for ${packageName}', () => {
  it('placeholder test', () => {
    expect(true).toBeTruthy();
  });
});
`;
  }

  fs.writeFileSync(testPath, testContent);
  console.log(`Generated test for ${packageName}: ${testFile}`);
}

// Define packages and their test generation configuration
const packagesToTest = [
  { name: 'access-control', src: 'access.control.module.ts', test: 'access-control.extended.spec.ts' },
  { name: 'open-api-spec-to-ts', src: 'lib/spec-parser.ts', test: 'spec-parser.extended.spec.ts' },
  { name: 'version-generator', src: 'lib/lib.ts', test: 'version-generator.extended.spec.ts' }
];

packagesToTest.forEach(pkg => {
  generateTest(pkg.name, pkg.src, pkg.test);
});

console.log('Extended test generation completed.');