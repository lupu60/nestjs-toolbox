import { readDir, removeFile } from '../files';
import { generate } from '../spec-parser';

describe('OpenAPISpecParser', () => {
    const interfaceFilePath = `${__dirname}/interfaces`;

    afterAll(async () => {
        const files = await readDir(interfaceFilePath);
        return Promise.all(Object.values(files).map((file) => removeFile(`${interfaceFilePath}/${file}`)));
    });

    it('should generate from a valid Open API file', async () => {
        const testFile = `${__dirname}/uspto.json`;
        await generate(testFile, interfaceFilePath);
    });

    it('should generate from a valid Open API file 2', async () => {
        const testFile = `${__dirname}/petstore.json`;
        await generate(testFile, interfaceFilePath);
    });

    it('should throw no such file or directory', async () => {
        const invalidTestFile = `./invalid-path.json`;
        await expect(generate(invalidTestFile, interfaceFilePath)).rejects.toThrow(`ENOENT: no such file or directory, open '${invalidTestFile}'`);
    });
});
