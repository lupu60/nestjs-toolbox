#!/usr/bin/env node
import { program } from 'commander';
const { exec: callbackexec } = require('child_process');

export interface Options {
  master: string;
  develop: string;
  commitSha: string;
  tag: boolean;
  developLabel: string;
  labelSeparator: string;
  commitIdSeparator: string;
  version: string;
}

program
  .name('version-generator')
  .description('Generate version from git branch and commit sha')
  .option('-v, --version [0.0.0]', 'version from package json')
  .option('--commit-sha [commit-sha]')
  .option('--tag [boolean]', '--tag [boolean]', false)
  .option('--master [master]', 'master branch identifier', 'master')
  .option('--develop [develop]', 'develop branch identifier', 'develop')
  .option('--develop-label [develop-label]', 'develop-label identifier', 'beta')
  .option('--label-separator [label-separator]', 'label-separator', '-')
  .option('--commit-id-separator [commit-id-separator]', 'commit-id-separator', '.')
  .parse(process.argv);

const options = program.opts() as Options;

if (!options.version) {
  throw new Error('version is required');
}
if (!options.commitSha) {
  throw new Error('commit sha is required');
}

function generate_develop_version() {
  const { version, developLabel, labelSeparator, commitIdSeparator, commitSha } = options;
  const develop_version = `${version}${labelSeparator}${developLabel}${commitIdSeparator}${commitSha}`;
  return develop_version;
}

function generate_master_version() {
  const { version, commitIdSeparator, commitSha } = options;
  const develop_version = `${version}${commitIdSeparator}${commitSha}`;
  return develop_version;
}

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

async function main() {
  const branch = await exec<string>('git branch --show-current');
  if (branch.includes(options.master) || options.tag) {
    console.log(generate_master_version());
  }
  if (branch.includes(options.develop) && !options.tag) {
    console.log(generate_develop_version());
  }
}

// console.log(JSON.stringify(options));
main();
