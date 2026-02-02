
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
