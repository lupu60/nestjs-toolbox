#!/usr/bin/env node
import { program } from 'commander';
const { exec: callbackexec } = require('child_process');
const fs = require('fs');
const path = require('path');

export interface Options {
  master: string;
  develop: string;
  feature: string;
  commitSha: string;
  tag: boolean | string;
  packageJson: string;
  developLabel: string;
  alphaLabel: string;
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
  .option('--feature [feature]', 'feature branch identifier', 'feature')
  .option('--develop-label [develop-label]', 'develop-label identifier', 'beta')
  .option('--alpha-label [alpha-label]', 'alpha-label identifier', 'alpha')
  .option('--label-separator [label-separator]', 'label-separator', '-')
  .option('--commit-id-separator [commit-id-separator]', 'commit-id-separator', '.')
  .parse(process.argv);

function generate_feature_version(options: Options) {
  const { version, alphaLabel, labelSeparator, commitIdSeparator, commitSha } = options;
  return `${version}${labelSeparator}${alphaLabel}${commitIdSeparator}${commitSha.slice(0, 7)}`;
}

function generate_develop_version(options: Options) {
  const { version, developLabel, labelSeparator, commitIdSeparator, commitSha } = options;
  return `${version}${labelSeparator}${developLabel}${commitIdSeparator}${commitSha.slice(0, 7)}`;
}

function generate_master_version(options: Options) {
  const { version, commitIdSeparator, commitSha } = options;
  return `${version}${commitIdSeparator}${commitSha.slice(0, 7)}`;
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

function getCurrentBranchName(p = process.cwd()) {
  const gitHeadPath = `${p}/.git/HEAD`;
  return fs.existsSync(p)
    ? fs.existsSync(gitHeadPath)
      ? fs.readFileSync(gitHeadPath, 'utf-8').trim().split('/')[2]
      : getCurrentBranchName(path.resolve(p, '..'))
    : false;
}

async function generate(options) {
  const branch = await getCurrentBranchName();

  const isMaster = branch.includes(options.master) || options.tag;
  if (isMaster) {
    return generate_master_version(options);
  }

  const isDevelop = branch.includes(options.develop) && !options.tag;
  if (isDevelop) {
    return generate_develop_version(options);
  }

  const isFeature = branch.includes(options.feature);
  if (isFeature) {
    return generate_feature_version(options);
  }

  return undefined;
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

  const generated = await generate(options);
  console.log(generated);
}

main();

process.on('uncaughtException', (err) => {
  console.error(err);
  process.exit(1);
});
