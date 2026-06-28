import { promises as fs } from 'node:fs';

export const readFile = (path: string): Promise<string> => fs.readFile(path, 'utf8');
export const writeFile = (path: string, data: string): Promise<void> => fs.writeFile(path, data);
export const appendFile = (path: string, data: string): Promise<void> => fs.appendFile(path, data);
export const removeFile = (path: string): Promise<void> => fs.unlink(path);
export const readDir = (path: string): Promise<string[]> => fs.readdir(path);
