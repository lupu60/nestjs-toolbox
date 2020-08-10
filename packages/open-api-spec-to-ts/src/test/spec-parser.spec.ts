import { readDir, removeFile } from '../files';
import { generate } from '../spec-parser';

describe('OpenAPISpecParser', () => {
  const interfaceFilePath = './interfaces';

  afterAll(async () => {
    const files = await readDir(interfaceFilePath);
    Promise.all(files.map(async (file) => removeFile(file)));
  });

  it('should generate from a valid Open API file', () => {
    const testFile = 'petstore-expanded.json';
    generate(testFile, interfaceFilePath);
  });
});
