#!/usr/bin/env node
// Smoke-tests the packages exactly as published: packs each one, installs the tarballs into a throwaway
// project next to their peers, then loads them, boots a Nest app on them and type-checks a consumer file.
//
// Usage: npm run build && node scripts/smoke-pack.mjs [--nest <version>] [package-name ...]
//   --nest <version>  install this @nestjs/* version instead of the workspace one (peer-range check)
//   package-name      limit the run to these packages (default: all)
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const nestFlag = args.indexOf('--nest');
const nestVersion = nestFlag === -1 ? undefined : args.splice(nestFlag, 2)[1];
const selected = args.length > 0 ? args : readdirSync(join(root, 'packages')).filter((name) => existsSync(join(root, 'packages', name, 'package.json')));

const run = (command, commandArgs, options = {}) => execFileSync(command, commandArgs, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], ...options });
const installedVersion = (name) => JSON.parse(readFileSync(join(root, 'node_modules', name, 'package.json'), 'utf8')).version;

const allowedFile = (path) => path.startsWith('dist/') || ['package.json', 'README.md', 'LICENSE'].includes(path);
const testFile = (path) => /\.(spec|test)\.|(^|\/)test\//.test(path);

const workDir = mkdtempSync(join(tmpdir(), 'nest-toolbox-smoke-'));
const tarballDir = join(workDir, 'tarballs');
const projectDir = join(workDir, 'consumer');
mkdirSync(tarballDir);
mkdirSync(projectDir);

try {
  console.log(`Packing ${selected.length} package(s)`);
  const dependencies = {};
  for (const name of selected) {
    const packageDir = join(root, 'packages', name);
    if (!existsSync(join(packageDir, 'dist', 'index.js'))) {
      throw new Error(`packages/${name}/dist/index.js is missing. Run "npm run build" first.`);
    }

    const [packed] = JSON.parse(run('npm', ['pack', '--json', '--pack-destination', tarballDir], { cwd: packageDir }));
    const files = packed.files.map((file) => file.path);
    const unexpected = files.filter((path) => !allowedFile(path) || testFile(path));
    if (unexpected.length > 0) {
      throw new Error(`${packed.name} would publish unexpected files:\n  ${unexpected.join('\n  ')}`);
    }
    for (const required of ['dist/index.js', 'dist/index.d.ts']) {
      if (!files.includes(required)) {
        throw new Error(`${packed.name} tarball is missing ${required}`);
      }
    }
    dependencies[packed.name] = `file:${join(tarballDir, packed.filename.replace('@', '').replace('/', '-'))}`;
    console.log(`  ${packed.name}: ${files.length} files`);
  }

  // Peers and runtime pieces a consuming Nest app provides itself
  const nest = (name) => nestVersion ?? installedVersion(name);
  Object.assign(dependencies, {
    '@nestjs/common': nest('@nestjs/common'),
    '@nestjs/core': nest('@nestjs/core'),
    '@nestjs/platform-express': nest('@nestjs/platform-express'),
    '@nestjs/typeorm': nestVersion ? `^${nestVersion.split('.')[0]}.0.0` : installedVersion('@nestjs/typeorm'),
    '@types/node': installedVersion('@types/node'),
    'reflect-metadata': installedVersion('reflect-metadata'),
    rxjs: installedVersion('rxjs'),
    'sql.js': installedVersion('sql.js'),
    typeorm: installedVersion('typeorm'),
  });

  writeFileSync(join(projectDir, 'package.json'), `${JSON.stringify({ name: 'smoke-consumer', private: true, dependencies }, null, 2)}\n`);
  console.log(`Installing into ${projectDir}${nestVersion ? ` with Nest ${nestVersion}` : ''}`);
  run('npm', ['install', '--no-audit', '--no-fund', '--loglevel', 'error'], { cwd: projectDir });

  console.log('Loading packages and booting a Nest app');
  cpSync(join(root, 'scripts', 'smoke', 'consumer.cjs'), join(projectDir, 'consumer.cjs'));
  run('node', ['consumer.cjs'], { cwd: projectDir, stdio: 'inherit', env: { ...process.env, SMOKE_PACKAGES: JSON.stringify(selected) } });

  if (selected.includes('version-generator')) {
    console.log('Running the version-generator bin');
    const bin = join(projectDir, 'node_modules', '.bin', 'version-generator');
    const version = run(bin, ['--version', '1.2.3', '--commit-sha', 'ebffb639b71631c1', '--tag', 'true'], { cwd: projectDir }).trim();
    if (version !== '1.2.3.ebffb63') {
      throw new Error(`version-generator printed "${version}", expected "1.2.3.ebffb63"`);
    }
  }

  console.log('Type-checking a consumer file');
  const imports = selected.filter((name) => name !== 'version-generator').map((name, index) => `import * as p${index} from '@nest-toolbox/${name}';\nvoid p${index};`);
  writeFileSync(join(projectDir, 'consumer.ts'), `${imports.join('\n')}\n`);
  writeFileSync(
    join(projectDir, 'tsconfig.json'),
    `${JSON.stringify(
      {
        compilerOptions: { module: 'commonjs', target: 'es2017', strict: true, noEmit: true, skipLibCheck: true, esModuleInterop: true, experimentalDecorators: true, types: ['node'] },
        files: ['consumer.ts'],
      },
      null,
      2,
    )}\n`,
  );
  run(join(root, 'node_modules', '.bin', 'tsc'), ['-p', projectDir], { stdio: 'inherit' });

  console.log('Smoke test passed');
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
