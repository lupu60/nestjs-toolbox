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
});
