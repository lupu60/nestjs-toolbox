#!/usr/bin/env node
import { program } from 'commander';
import { generate_version, type Options } from './lib/lib';

const fs = require('node:fs');
const path = require('node:path');

program
  .name('version-generator')
  .description('Generate version from git branch and commit sha')
  .option('-v, --version [0.0.0]', 'version from package json')
  .option('--package-json [path]', 'path to package json')
  .option('--commit-sha [commit-sha]')
  .option('--tag [boolean]', '--tag [boolean]', false)
  .option('--master [master]', 'master branch identifier', 'master')
  .option('--develop [develop]', 'develop branch identifier', 'develop')
  .option('--feature [feature]', 'feature branch identifier', 'feature')
  .option('--develop-label [develop-label]', 'develop-label identifier', 'beta')
  .option('--alpha-label [alpha-label]', 'alpha-label identifier', 'alpha')
  .option('--label-separator [label-separator]', 'label-separator', '-')
  .option('--commit-id-separator [commit-id-separator]', 'commit-id-separator', '.')
  .parse(process.argv);

function getCurrentBranchName(p = process.cwd()): string {
  const gitHeadPath = `${p}/.git/HEAD`;
  if (fs.existsSync(p)) {
    if (fs.existsSync(gitHeadPath)) {
      return fs.readFileSync(gitHeadPath, 'utf-8').trim().split('/')[2] || '';
    }
    return getCurrentBranchName(path.resolve(p, '..'));
  }
  return '';
}

async function main() {
  const options = program.opts() as Options;
  options.tag = options.tag === 'true';
  // console.log(JSON.stringify(options));
  if (options.packageJson) {
    const packageJsonPath = options.packageJson;
    const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);
    if (packageJson && typeof packageJson.version !== 'undefined') {
      options.version = String(packageJson.version).trim();
    }
  }

  if (!options.version) {
    console.error(new Error('version is required'));
    return;
  }

  if (!options.commitSha) {
    console.error(new Error('commit sha is required'));
    return;
  }
  const branch = await getCurrentBranchName();
  const generated = generate_version(options, branch);
  console.log(generated);
}

main();

process.on('uncaughtException', (err) => {
  console.error(err);
  process.exit(1);
});
