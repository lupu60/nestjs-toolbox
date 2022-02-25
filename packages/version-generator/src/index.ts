#!/usr/bin/env node
import { program } from 'commander';
const { exec: callbackexec } = require('child_process');

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

export interface Options {
  master: string;
  develop: string;
  commitSha: string;
  tag: boolean;
  packageJson: string;
  developLabel: string;
  labelSeparator: string;
  commitIdSeparator: string;
  version: string;
}

program
  .name('version-generator')
  .description('Generate version from git branch and commit sha')
  .option('-v, --version [0.0.0]', 'version from package json')
  .option('--package-json [path]', 'path to package json')
  .option('--commit-sha [commit-sha]')
  .option('--tag [boolean]', '--tag [boolean]', false)
  .option('--master [master]', 'master branch identifier', 'master')
  .option('--develop [develop]', 'develop branch identifier', 'develop')
  .option('--develop-label [develop-label]', 'develop-label identifier', 'beta')
  .option('--label-separator [label-separator]', 'label-separator', '-')
  .option('--commit-id-separator [commit-id-separator]', 'commit-id-separator', '.')
  .parse(process.argv);

function generate_develop_version(options: Options) {
  const { version, developLabel, labelSeparator, commitIdSeparator, commitSha } = options;
  const develop_version = `${version}${labelSeparator}${developLabel}${commitIdSeparator}${commitSha.slice(0, 7)}`;
  return develop_version;
}

function generate_master_version(options: Options) {
  const { version, commitIdSeparator, commitSha } = options;
  const develop_version = `${version}${commitIdSeparator}${commitSha.slice(0, 7)}`;
  return develop_version;
}

async function main() {
  const options = program.opts() as Options;
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

  const branch = await exec<string>('git branch --show-current');
  if (branch.includes(options.master) || options.tag) {
    console.log(generate_master_version(options));
  }
  if (branch.includes(options.develop) && !options.tag) {
    console.log(generate_develop_version(options));
  }
}

main();

process.on('uncaughtException', (err) => {
  console.error(err);
  process.exit(1);
});
