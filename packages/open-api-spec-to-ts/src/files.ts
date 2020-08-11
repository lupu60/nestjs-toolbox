import * as fs from 'fs';

export const readFile = (path: string): Promise<string> =>
    new Promise((resolve, reject) => fs.readFile(path, 'utf8', (err: Error, res) => (err ? reject(err) : resolve(res))));

export const writeFile = (path: string, data: any): Promise<void> =>
    new Promise((resolve, reject) => fs.writeFile(path, data, (err) => (err ? reject(err) : resolve())));

export const appendFile = (path: string, data: any): Promise<void> =>
    new Promise((resolve, reject) => fs.appendFile(path, data, (err) => (err ? reject(err) : resolve())));

export const removeFile = (path: string): Promise<void> =>
    new Promise((resolve, reject) => fs.unlink(path, (err) => (err && err.message === 'EENOENT' ? reject(err) : resolve())));

export const readDir = (path: string): Promise<string[] | null> =>
    new Promise((resolve, reject) => fs.readdir(path, (err, files) => (err ? reject(err) : resolve(files))));
