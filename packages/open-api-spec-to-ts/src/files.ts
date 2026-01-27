import * as fs from 'fs';

type ErrnoException = NodeJS.ErrnoException;

export const readFile = (path: string): Promise<string> =>
  new Promise((resolve, reject) => fs.readFile(path, 'utf8', (err: ErrnoException | null, res: string) => (err ? reject(err) : resolve(res))));

export const writeFile = (path: string, data: string): Promise<void> =>
  new Promise((resolve, reject) => fs.writeFile(path, data, (err: ErrnoException | null) => (err ? reject(err) : resolve())));

export const appendFile = (path: string, data: string): Promise<void> =>
  new Promise((resolve, reject) => fs.appendFile(path, data, (err: ErrnoException | null) => (err ? reject(err) : resolve())));

export const removeFile = (path: string): Promise<void> =>
  new Promise((resolve, reject) => fs.unlink(path, (err: ErrnoException | null) => (err && err.code === 'ENOENT' ? reject(err) : resolve())));

export const readDir = (path: string): Promise<string[]> =>
  new Promise((resolve, reject) => fs.readdir(path, (err: ErrnoException | null, files: string[]) => (err ? reject(err) : resolve(files || []))));
