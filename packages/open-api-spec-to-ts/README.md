### Open API spec to TS

Generate Typescript interfaces and enums in a specified folder, from you Open API specifications.
Depends on [json-schema-to-typescript](https://github.com/bcherny/json-schema-to-typescript).

## Installation

```bash
npm i @nest-toolbox/open-api-spec-to-ts
```

## Usage

### Inside a module

```ts
import { generate } from '@nest-toolbox/open-api-spec-to-ts';

const openApiFilePath = './openapi.json';
const interfacesDirPath = './interfaces';

generate(openApiFilePath, interfacesDirPath);
```

### As a CLI tool

```js
import { generate, LogLevel } from '@nest-toolbox/open-api-spec-to-ts';
import { argv } from 'yargs';

const openApiFilePath = argv.openApiPath || './openapi.json';
const interfacesDirPath = argv.interfacesPath || './interfaces';
const verbosity = argv.verbosity || LogLevel.INFO;

generate(openApiFilePath, interfacesDirPath, { verbosity });
```

```bash
node ./<your-file>.js --openApiPath='./openapi.json' --interfacesPath='./interfaces'"
```
