---
sidebar_label: "version-generator"
---

# @nest-toolbox/version-generator

[![npm version](https://badge.fury.io/js/%40nest-toolbox%2Fversion-generator.svg)](https://www.npmjs.com/package/@nest-toolbox/version-generator)

A CLI tool that generates semantic version strings from git branch names and commit SHAs — perfect for CI/CD pipelines.

## Installation

```bash
npm install @nest-toolbox/version-generator
```

Or install globally:

```bash
npm install -g @nest-toolbox/version-generator
```

## Quick Start

```bash
# On master branch with a tag
npx version-generator -v 1.2.0 --commit-sha abc1234
# → 1.2.0.abc1234

# On develop branch
npx version-generator -v 1.2.0 --commit-sha abc1234
# → 1.2.0-beta.abc1234

# On a feature branch
npx version-generator -v 1.2.0 --commit-sha abc1234
# → 1.2.0-alpha.abc1234
```

## Features

- 🏷️ **Branch-aware versioning** — generates different version formats for master, develop, and feature branches
- 🔧 **Fully configurable** — customize branch identifiers, labels, and separators
- 📦 **Reads package.json** — optionally extract version from `package.json` instead of CLI args
- 🏗️ **CI/CD ready** — outputs a single version string to stdout for piping into build scripts
- 🔀 **Tag support** — treats tagged commits as master/release versions

## API Reference

### CLI Usage

```bash
version-generator [options]
```

#### CLI Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `-v, --version` | `string` | — | Base version (e.g., `1.2.0`). **Required** unless `--package-json` is set |
| `--commit-sha` | `string` | — | Git commit SHA. **Required** |
| `--package-json` | `string` | — | Path to `package.json` to read version from |
| `--tag` | `boolean` | `false` | Treat as a tagged release (master version format) |
| `--master` | `string` | `'master'` | Branch identifier for master/main branch |
| `--develop` | `string` | `'develop'` | Branch identifier for develop branch |
| `--feature` | `string` | `'feature'` | Branch identifier for feature branches |
| `--develop-label` | `string` | `'beta'` | Label for develop branch versions |
| `--alpha-label` | `string` | `'alpha'` | Label for feature branch versions |
| `--label-separator` | `string` | `'-'` | Separator between version and label |
| `--commit-id-separator` | `string` | `'.'` | Separator between label and commit SHA |

### Programmatic API

You can also use the version generation functions directly:

```typescript
import {
  generate_version,
  generate_master_version,
  generate_develop_version,
  generate_feature_version,
} from '@nest-toolbox/version-generator/lib/lib';
```

#### `generate_version(options, branch)`

Main function — determines branch type and generates the appropriate version.

```typescript
import { generate_version } from '@nest-toolbox/version-generator/lib/lib';

const version = generate_version(
  {
    version: '1.5.0',
    commitSha: 'abc1234def',
    master: 'master',
    develop: 'develop',
    feature: 'feature',
    developLabel: 'beta',
    alphaLabel: 'alpha',
    labelSeparator: '-',
    commitIdSeparator: '.',
    tag: false,
  },
  'develop',
);
// → "1.5.0-beta.abc1234"
```

Returns `'latest'` if the branch doesn't match any known pattern.

#### `generate_master_version(options)`

Generate a version for production/master branch.

```typescript
generate_master_version({
  version: '1.5.0',
  commitSha: 'abc1234def',
  commitIdSeparator: '.',
});
// → "1.5.0.abc1234"
```

**Format:** `{version}{commitIdSeparator}{commitSha[0:7]}`

#### `generate_develop_version(options)`

Generate a version for the develop branch.

```typescript
generate_develop_version({
  version: '1.5.0',
  commitSha: 'abc1234def',
  developLabel: 'beta',
  labelSeparator: '-',
  commitIdSeparator: '.',
});
// → "1.5.0-beta.abc1234"
```

**Format:** `{version}{labelSeparator}{developLabel}{commitIdSeparator}{commitSha[0:7]}`

#### `generate_feature_version(options)`

Generate a version for feature branches.

```typescript
generate_feature_version({
  version: '1.5.0',
  commitSha: 'abc1234def',
  alphaLabel: 'alpha',
  labelSeparator: '-',
  commitIdSeparator: '.',
});
// → "1.5.0-alpha.abc1234"
```

**Format:** `{version}{labelSeparator}{alphaLabel}{commitIdSeparator}{commitSha[0:7]}`

#### Branch Detection Functions

```typescript
import { isMaster, isDevelop, isFeature } from '@nest-toolbox/version-generator/lib/lib';

isMaster({ options: { master: 'master', tag: false }, branch: 'master' });   // true
isMaster({ options: { master: 'main', tag: false }, branch: 'main' });       // true
isMaster({ options: { tag: true }, branch: 'anything' });                     // true (tags are master)

isDevelop({ options: { develop: 'develop', tag: false }, branch: 'develop' }); // true
isFeature({ options: { feature: 'feature', tag: false }, branch: 'feature/add-auth' }); // true
```

#### `Options` Interface

```typescript
interface Options {
  master: string;            // Branch identifier for master
  develop: string;           // Branch identifier for develop
  feature: string;           // Branch identifier for feature
  commitSha: string;         // Git commit SHA
  tag: boolean | string;     // Whether this is a tagged release
  packageJson: string;       // Path to package.json
  developLabel: string;      // Label for develop versions
  alphaLabel: string;        // Label for feature versions
  labelSeparator: string;    // Separator between version and label
  commitIdSeparator: string; // Separator between label and commit SHA
  version: string;           // Base semantic version
}
```

## Examples

### CI/CD pipeline (GitHub Actions)

```yaml
- name: Generate version
  run: |
    VERSION=$(npx version-generator \
      -v $(node -p "require('./package.json').version") \
      --commit-sha ${{ github.sha }})
    echo "VERSION=$VERSION" >> $GITHUB_ENV

- name: Build Docker image
  run: docker build -t myapp:${{ env.VERSION }} .
```

### Reading version from package.json

```bash
npx version-generator --package-json ./package.json --commit-sha abc1234
```

### Custom branch naming conventions

```bash
# Using 'main' instead of 'master', 'dev' instead of 'develop'
npx version-generator \
  -v 2.0.0 \
  --commit-sha abc1234 \
  --master main \
  --develop dev \
  --feature feat
```

### Custom labels and separators

```bash
# Using '+' as commit separator (SemVer build metadata style)
npx version-generator \
  -v 1.0.0 \
  --commit-sha abc1234 \
  --commit-id-separator '+' \
  --develop-label rc \
  --alpha-label dev
# develop → 1.0.0-rc+abc1234
# feature → 1.0.0-dev+abc1234
```

### Version output by branch type

| Branch | Tag | Output |
|--------|-----|--------|
| `master` | `false` | `1.0.0.abc1234` |
| any | `true` | `1.0.0.abc1234` |
| `develop` | `false` | `1.0.0-beta.abc1234` |
| `feature/auth` | `false` | `1.0.0-alpha.abc1234` |
| `hotfix/bug` | `false` | `latest` |
