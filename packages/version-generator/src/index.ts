#!/usr/bin/env node
import { program } from 'commander';
import { generate_version, Options } from './lib/lib';
const { exec: callbackexec } = require('child_process');
const fs = require('fs');
const path = require('path');

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

function exec<T>(command): Promise<T> {
  return new Promise(function (resolve, reject) {
    callbackexec(command, (error, stdout, stderr) => {
      if (error || stderr) {
        reject(error || stderr);
        return;
      }
      resolve(stdout.trim());
    });
  });
}

function getCurrentBranchName(p = process.cwd()) {
  const gitHeadPath = `${p}/.git/HEAD`;
  return fs.existsSync(p)
    ? fs.existsSync(gitHeadPath)
      ? fs.readFileSync(gitHeadPath, 'utf-8').trim().split('/')[2]
      : getCurrentBranchName(path.resolve(p, '..'))
    : false;
}

async function main() {
  const options = program.opts() as Options;
  options.tag = options.tag == 'true';
  // console.log(JSON.stringify(options));
  if (options.packageJson) {
    options.version = await exec<string>(`cat ${options.packageJson} |
      grep version |
      head -1 |
      awk -F: '{ print $2 }' |
      sed 's/[",]//g'`);
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
