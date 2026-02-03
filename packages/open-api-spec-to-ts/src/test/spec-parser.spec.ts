import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { readDir, removeFile } from '../files';
import { generate } from '../spec-parser';

describe('OpenAPISpecParser', () => {
  // Resolve test directory path - works in both source and compiled output
  // Find the source directory by looking for package.json and then src/test
  const findPackageRoot = (startDir: string): string | null => {
    let dir = startDir;
    const root = resolve('/');

    while (dir !== root) {
      if (existsSync(join(dir, 'package.json'))) {
        // Check if this is the open-api-spec-to-ts package
        try {
          const pkg = require(join(dir, 'package.json'));
          if (pkg.name === '@nest-toolbox/open-api-spec-to-ts') {
            return dir;
          }
        } catch {
          // Ignore errors
        }
      }
      dir = dirname(dir);
    }

    return null;
  };

  const getTestDir = () => {
    const currentDir = __dirname;

    // Check if JSON files exist in current directory (source)
    if (existsSync(join(currentDir, 'uspto.json'))) {
      return currentDir;
    }

    // If we're in dist/build, find package root and then src/test
    const packageRoot = findPackageRoot(currentDir);
    if (packageRoot) {
      const srcTestDir = resolve(packageRoot, 'src', 'test');
      if (existsSync(join(srcTestDir, 'uspto.json'))) {
        return srcTestDir;
      }
    }

    // Fallback: try replacing dist/build with src
    const normalizedPath = currentDir.replace(/\\/g, '/');
    const distMatch = normalizedPath.match(/(.*)\/(dist|build)\/src\/test/);
    if (distMatch) {
      const srcTestDir = resolve(distMatch[1], 'src', 'test');
      if (existsSync(join(srcTestDir, 'uspto.json'))) {
        return srcTestDir;
      }
    }

    return currentDir;
  };

  const basePath = getTestDir();
  const interfaceFilePath = join(basePath, 'interfaces');

  afterAll(async () => {
    // Only clean up if the directory exists
    if (existsSync(interfaceFilePath)) {
      try {
        const files = await readDir(interfaceFilePath);
        if (files) {
          await Promise.all(Object.values(files).map((file) => removeFile(`${interfaceFilePath}/${file}`)));
        }
      } catch {
        // Ignore errors during cleanup
      }
    }
  });

  it('should generate from a valid Open API file', async () => {
    const testFile = `${basePath}/uspto.json`;
    await generate(testFile, interfaceFilePath);
  });

  it('should generate from a valid Open API file 2', async () => {
    const testFile = `${basePath}/petstore.json`;
    await generate(testFile, interfaceFilePath);
  });

  it('should throw no such file or directory', async () => {
    const invalidTestFile = './invalid-path.json';
    await expect(generate(invalidTestFile, interfaceFilePath)).rejects.toThrow(`ENOENT: no such file or directory, open '${invalidTestFile}'`);
  });

  it('should handle OpenAPI spec with string enums', async () => {
    const testFile = `${basePath}/petstore.json`;
    await generate(testFile, interfaceFilePath, { verbosity: 0 });
    // Verify that the interfaces directory was created and populated
    expect(existsSync(interfaceFilePath)).toBe(true);
    const files = await readDir(interfaceFilePath);
    expect(files.length).toBeGreaterThan(0);
  });

  it('should handle OpenAPI spec without components', async () => {
    const emptySpecPath = `${basePath}/empty-spec.json`;
    const emptySpec = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Empty API', version: '1.0.0' },
      paths: {},
    });

    // Create temporary test file
    const { writeFile } = await import('../files');
    await writeFile(emptySpecPath, emptySpec);

    // Should not throw and should handle gracefully
    await generate(emptySpecPath, interfaceFilePath);

    // Clean up
    await removeFile(emptySpecPath);
  });

  it('should handle OpenAPI spec without schemas in components', async () => {
    const noSchemasPath = `${basePath}/no-schemas.json`;
    const noSchemasSpec = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'No Schemas API', version: '1.0.0' },
      paths: {},
      components: {
        parameters: {},
      },
    });

    const { writeFile } = await import('../files');
    await writeFile(noSchemasPath, noSchemasSpec);

    await generate(noSchemasPath, interfaceFilePath);

    await removeFile(noSchemasPath);
  });

  it('should create interfaces directory if it does not exist', async () => {
    const newInterfacePath = join(basePath, 'new-interfaces-test');
    const testFile = `${basePath}/uspto.json`;

    // Ensure directory doesn't exist
    if (existsSync(newInterfacePath)) {
      const files = await readDir(newInterfacePath);
      if (files) {
        await Promise.all(files.map((file) => removeFile(join(newInterfacePath, file))));
      }
    }

    await generate(testFile, newInterfacePath);

    // Verify directory was created
    expect(existsSync(newInterfacePath)).toBe(true);

    // Clean up
    const files = await readDir(newInterfacePath);
    if (files) {
      await Promise.all(files.map((file) => removeFile(join(newInterfacePath, file))));
    }
  });

  it('should handle generation with custom options', async () => {
    const testFile = `${basePath}/petstore.json`;
    const customInterfacePath = join(basePath, 'custom-interfaces');

    await generate(testFile, customInterfacePath, {
      verbosity: 2,
      bannerComment: '/* Custom Banner */',
      strictIndexSignatures: true,
    });

    expect(existsSync(customInterfacePath)).toBe(true);

    // Clean up
    const files = await readDir(customInterfacePath);
    if (files) {
      await Promise.all(files.map((file) => removeFile(join(customInterfacePath, file))));
    }
  });

  it('should handle OpenAPI spec with string enums and auto-generate enum names', async () => {
    const enumSpecPath = `${basePath}/enum-spec.json`;
    const enumSpec = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Enum API', version: '1.0.0' },
      paths: {},
      components: {
        schemas: {
          Status: {
            type: 'string',
            enum: ['active', 'inactive', 'pending'],
          },
        },
      },
    });

    const { writeFile } = await import('../files');
    await writeFile(enumSpecPath, enumSpec);

    const enumInterfacePath = join(basePath, 'enum-interfaces');
    await generate(enumSpecPath, enumInterfacePath);

    expect(existsSync(enumInterfacePath)).toBe(true);

    // Clean up
    await removeFile(enumSpecPath);
    const files = await readDir(enumInterfacePath);
    if (files) {
      await Promise.all(files.map((file) => removeFile(join(enumInterfacePath, file))));
    }
  });

  it('should skip directory creation when directory already exists', async () => {
    const testFile = `${basePath}/petstore.json`;
    const existingDir = join(basePath, 'existing-interfaces');

    // Create directory first
    const { mkdirSync } = await import('node:fs');
    if (!existsSync(existingDir)) {
      mkdirSync(existingDir, { recursive: true });
    }

    // Generate interfaces in existing directory
    await generate(testFile, existingDir);

    expect(existsSync(existingDir)).toBe(true);

    // Clean up
    const files = await readDir(existingDir);
    if (files) {
      await Promise.all(files.map((file) => removeFile(join(existingDir, file))));
    }
  });

  it('should handle error during schema parsing gracefully', async () => {
    const invalidSchemaPath = `${basePath}/invalid-schema.json`;
    const invalidSpec = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Invalid API', version: '1.0.0' },
      paths: {},
      components: {
        schemas: {
          InvalidSchema: {
            type: 'object',
            properties: null, // This might cause issues during processing
          },
        },
      },
    });

    const { writeFile } = await import('../files');
    await writeFile(invalidSchemaPath, invalidSpec);

    const invalidInterfacePath = join(basePath, 'invalid-interfaces');

    // Should not throw, but handle error internally
    await generate(invalidSchemaPath, invalidInterfacePath);

    // Clean up
    await removeFile(invalidSchemaPath);
    if (existsSync(invalidInterfacePath)) {
      const files = await readDir(invalidInterfacePath);
      if (files) {
        await Promise.all(files.map((file) => removeFile(join(invalidInterfacePath, file))));
      }
    }
  });

  it('should handle non-existent directory in removeExistingInterfaces', async () => {
    const nonExistentDir = join(basePath, 'non-existent-dir-12345');
    const testFile = `${basePath}/petstore.json`;

    // This should create the directory and not fail
    await generate(testFile, nonExistentDir);

    expect(existsSync(nonExistentDir)).toBe(true);

    // Clean up
    const files = await readDir(nonExistentDir);
    if (files) {
      await Promise.all(files.map((file) => removeFile(join(nonExistentDir, file))));
    }
  });

  it('should handle schema without type field', async () => {
    const noTypeSchemaPath = `${basePath}/no-type-schema.json`;
    const noTypeSpec = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'No Type API', version: '1.0.0' },
      paths: {},
      components: {
        schemas: {
          NoTypeSchema: {
            description: 'Schema without type',
            properties: {
              id: { type: 'string' },
            },
          },
          WithTypeSchema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
          },
        },
      },
    });

    const { writeFile } = await import('../files');
    await writeFile(noTypeSchemaPath, noTypeSpec);

    const noTypeInterfacePath = join(basePath, 'no-type-interfaces');
    await generate(noTypeSchemaPath, noTypeInterfacePath);

    // Clean up
    await removeFile(noTypeSchemaPath);
    if (existsSync(noTypeInterfacePath)) {
      const files = await readDir(noTypeInterfacePath);
      if (files) {
        await Promise.all(files.map((file) => removeFile(join(noTypeInterfacePath, file))));
      }
    }
  });

  it('should handle malformed JSON file', async () => {
    const malformedPath = `${basePath}/malformed.json`;
    const malformedContent = '{ "openapi": "3.0.0", invalid json }';

    const { writeFile } = await import('../files');
    await writeFile(malformedPath, malformedContent);

    const malformedInterfacePath = join(basePath, 'malformed-interfaces');

    // Should throw error for malformed JSON
    await expect(generate(malformedPath, malformedInterfacePath)).rejects.toThrow();

    // Clean up
    await removeFile(malformedPath);
  });

  it('should generate with ERROR verbosity level', async () => {
    const testFile = `${basePath}/petstore.json`;
    const errorVerbosityPath = join(basePath, 'error-verbosity');

    await generate(testFile, errorVerbosityPath, {
      verbosity: 1, // LogLevel.ERROR
    });

    expect(existsSync(errorVerbosityPath)).toBe(true);

    // Clean up
    const files = await readDir(errorVerbosityPath);
    if (files) {
      await Promise.all(files.map((file) => removeFile(join(errorVerbosityPath, file))));
    }
  });

  it('should generate with NONE verbosity level', async () => {
    const testFile = `${basePath}/uspto.json`;
    const noneVerbosityPath = join(basePath, 'none-verbosity');

    await generate(testFile, noneVerbosityPath, {
      verbosity: 0, // LogLevel.NONE
    });

    expect(existsSync(noneVerbosityPath)).toBe(true);

    // Clean up
    const files = await readDir(noneVerbosityPath);
    if (files) {
      await Promise.all(files.map((file) => removeFile(join(noneVerbosityPath, file))));
    }
  });

  it('should handle complex schema with circular references', async () => {
    const circularRefPath = `${basePath}/circular-ref.json`;
    const circularSpec = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Circular Ref API', version: '1.0.0' },
      paths: {},
      components: {
        schemas: {
          Node: {
            type: 'object',
            properties: {
              value: { type: 'string' },
              children: {
                type: 'array',
                items: { $ref: '#/components/schemas/Node' },
              },
            },
          },
        },
      },
    });

    const { writeFile } = await import('../files');
    await writeFile(circularRefPath, circularSpec);

    const circularInterfacePath = join(basePath, 'circular-interfaces');
    await generate(circularRefPath, circularInterfacePath);

    // Clean up
    await removeFile(circularRefPath);
    if (existsSync(circularInterfacePath)) {
      const files = await readDir(circularInterfacePath);
      if (files) {
        await Promise.all(files.map((file) => removeFile(join(circularInterfacePath, file))));
      }
    }
  });

  it('should handle schema with oneOf, anyOf, and allOf', async () => {
    const combinedSchemaPath = `${basePath}/combined-schema.json`;
    const combinedSpec = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Combined Schema API', version: '1.0.0' },
      paths: {},
      components: {
        schemas: {
          CombinedType: {
            oneOf: [{ type: 'string' }, { type: 'number' }],
          },
          AnyOfType: {
            anyOf: [{ type: 'string' }, { type: 'boolean' }],
          },
          AllOfType: {
            allOf: [
              { type: 'object', properties: { id: { type: 'string' } } },
              { type: 'object', properties: { name: { type: 'string' } } },
            ],
          },
        },
      },
    });

    const { writeFile } = await import('../files');
    await writeFile(combinedSchemaPath, combinedSpec);

    const combinedInterfacePath = join(basePath, 'combined-interfaces');
    await generate(combinedSchemaPath, combinedInterfacePath);

    // Clean up
    await removeFile(combinedSchemaPath);
    if (existsSync(combinedInterfacePath)) {
      const files = await readDir(combinedInterfacePath);
      if (files) {
        await Promise.all(files.map((file) => removeFile(join(combinedInterfacePath, file))));
      }
    }
  });

  it('should handle schema with nested object properties', async () => {
    const nestedPath = `${basePath}/nested-schema.json`;
    const nestedSpec = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Nested API', version: '1.0.0' },
      paths: {},
      components: {
        schemas: {
          Address: {
            type: 'object',
            properties: {
              street: { type: 'string' },
              city: { type: 'string' },
            },
          },
          Person: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              age: { type: 'number' },
              address: { $ref: '#/components/schemas/Address' },
            },
          },
        },
      },
    });

    const { writeFile } = await import('../files');
    await writeFile(nestedPath, nestedSpec);

    const nestedInterfacePath = join(basePath, 'nested-interfaces');
    await generate(nestedPath, nestedInterfacePath);

    // Clean up
    await removeFile(nestedPath);
    if (existsSync(nestedInterfacePath)) {
      const files = await readDir(nestedInterfacePath);
      if (files) {
        await Promise.all(files.map((file) => removeFile(join(nestedInterfacePath, file))));
      }
    }
  });

  it('should handle schema with array of references', async () => {
    const arrayRefPath = `${basePath}/array-ref.json`;
    const arrayRefSpec = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Array Ref API', version: '1.0.0' },
      paths: {},
      components: {
        schemas: {
          Item: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
            },
          },
          ItemList: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: { $ref: '#/components/schemas/Item' },
              },
            },
          },
        },
      },
    });

    const { writeFile } = await import('../files');
    await writeFile(arrayRefPath, arrayRefSpec);

    const arrayRefInterfacePath = join(basePath, 'array-ref-interfaces');
    await generate(arrayRefPath, arrayRefInterfacePath);

    // Clean up
    await removeFile(arrayRefPath);
    if (existsSync(arrayRefInterfacePath)) {
      const files = await readDir(arrayRefInterfacePath);
      if (files) {
        await Promise.all(files.map((file) => removeFile(join(arrayRefInterfacePath, file))));
      }
    }
  });
});
