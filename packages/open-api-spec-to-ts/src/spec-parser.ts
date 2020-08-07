/* tslint:disable no-console */

import { OpenAPIObject } from '@nestjs/swagger';
import {
  ReferenceObject,
  SchemaObject,
} from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import * as chalk from 'chalk';
import { compile } from 'json-schema-to-typescript';
import { NormalizedJSONSchema } from 'json-schema-to-typescript/dist/src/types/JSONSchema';
import { snakeCase } from 'lodash';
import * as path from 'path';
import { appendFile, readDir, readFile, removeFile, writeFile } from './files';

type TsInterface = { filePath: string; name: string; content: string };

export enum LogLevel {
  NONE,
  ERROR,
  INFO,
}

let loggingLevel = LogLevel.NONE;

function logInfo(message: any) {
  if (loggingLevel >= LogLevel.INFO) {
    console.log(chalk.cyan.bold(message), 'SpecParser');
  }
}

function logSuccess(message: any) {
  if (loggingLevel >= LogLevel.INFO) {
    console.log(chalk.green.bold(message), 'SpecParser');
  }
}

function logError(message: any) {
  if (loggingLevel >= LogLevel.ERROR) {
    console.log(chalk.red.bold(message), 'SpecParser');
  }
}

function extractRefsFromSchema(inputSchema: SchemaObject | ReferenceObject) {
  const objectSchema = inputSchema as SchemaObject;
  const refSchema = inputSchema as ReferenceObject;
  switch (objectSchema.type) {
    case 'object':
      return preprocessProperties(objectSchema?.properties);
    case 'array':
      return extractRefsFromSchema(objectSchema.items);
    default:
      if (refSchema.$ref) {
        return refSchema.$ref;
      }
      // TODO: Handle allOf, anyOf
      return undefined;
  }
}

function preprocessProperties(inputProperties) {
  if (inputProperties) {
    return Object.entries(inputProperties).reduce((acc, [name, value]) => {
      return { ...acc, [name]: extractRefsFromSchema(value) };
    }, {});
  }
  return undefined;
}

async function createImport(
  name: string,
  schema: SchemaObject,
  filePath: string,
) {
  const refsMap: { key: string } | undefined = extractRefsFromSchema(schema);
  if (!refsMap || !Object.values(refsMap) || !Object.values(refsMap).length) {
    return;
  }

  const refsArray: string[] = Object.values(refsMap);
  const $refs = refsArray
    .filter(
      (val, index) =>
        val !== undefined &&
        !val.includes(name) &&
        refsArray.indexOf(val) === index,
    )
    .map((val) => val.split('/')[3]);

  if ($refs && $refs.length) {
    await appendFile(
      filePath,
      `import { ${$refs.join(', ')} } from './'; \n\n`,
    );
  }
}

async function createInterfaceFile(
  name: string,
  interfacesDirPath: string,
): Promise<string> {
  const bannerComment =
    '/* tslint:disable */\n/**\n* This file was automatically generated.\n* DO NOT MODIFY IT BY HAND.\n*/\n\n';
  const filePath = `${interfacesDirPath}/${name}.ts`;
  await writeFile(filePath, bannerComment);
  return filePath;
}

function removeEnum(content: string): string {
  const enumStartPosition = content.search('export enum');
  const interfaceStartPosition = content.search('export interface');
  if (enumStartPosition > -1 && interfaceStartPosition > -1) {
    const enumEndPosition =
      content.slice(enumStartPosition, content.length).indexOf('}') +
      enumStartPosition;
    const enumParts = content.slice(enumStartPosition, enumEndPosition + 1);
    content = content.replace(enumParts, '').trim();
    return removeEnum(content);
  }
  return content;
}

async function createInterfaceContent(
  name: string,
  openApiSpec: OpenAPIObject,
  filePath: string,
): Promise<string> {
  const components = openApiSpec.components;
  const schema = openApiSpec.components.schemas[name];

  await createImport(name, schema as SchemaObject, filePath);

  const options = {
    bannerComment: '',
    declareExternallyReferenced: false,
    enableConstEnums: true,
    unknownAny: false,
    unreachableDefinitions: true,
    strictIndexSignatures: false,
    style: {
      bracketSpacing: true,
      printWidth: 120,
      semi: true,
      singleQuote: true,
      tabWidth: 4,
      useTabs: false,
    },
  };

  const schemaAndDefinitions = {
    ...schema,
    components,
  } as NormalizedJSONSchema;
  let content = await compile(schemaAndDefinitions, name, options);

  // TODO: check future updates from json-schema-to-typescript, as next step should not be needed
  if (!options.declareExternallyReferenced) {
    content = removeEnum(content);
  }
  
  await appendFile(filePath, content);
  return content;
}

async function createInterface(
  name: string,
  openApiSpec: OpenAPIObject,
  interfacesDirPath: string,
): Promise<TsInterface> {
  await appendFile(
    `${interfacesDirPath}/index.ts`,
    `export * from './${name}';\n`,
  );
  const filePath = await createInterfaceFile(name, interfacesDirPath);
  const content = await createInterfaceContent(name, openApiSpec, filePath);
  logInfo(`${name} interface generated`);
  return { content, filePath, name };
}

async function parseSchema(
  name: string,
  openApiSpec: OpenAPIObject,
  interfacesDirPath: string,
): Promise<TsInterface | null> {
  const components = openApiSpec?.components;
  if (!components) {
    return null;
  }
  const schema = components?.schemas[name];
  return schema ? createInterface(name, openApiSpec, interfacesDirPath) : null;
}

function delayedParsing(
  schemaKey: string,
  openApiSpec: OpenAPIObject,
  interfacesDirPath: string,
  ms: number,
): Promise<TsInterface | null> {
  return new Promise((resolve, reject) =>
    setTimeout(
      () =>
        parseSchema(schemaKey, openApiSpec, interfacesDirPath)
          .then((res) => resolve(res))
          .catch((e) => reject(e)),
      ms,
    ),
  );
}

async function openApiToInterfaces(
  openApiSpec: OpenAPIObject,
  interfacesDirPath: string,
): Promise<void> {
  const schemasNames = Object.keys(openApiSpec.components.schemas).sort();
  await schemasNames.reduce(async (prevPromise, schemaKey) => {
    try {
      await prevPromise;
      return await delayedParsing(schemaKey, openApiSpec, interfacesDirPath, 0);
    } catch (error) {
      logError(error.message);
      return Promise.resolve({} as TsInterface);
    }
  }, Promise.resolve({} as TsInterface));
}

async function removeExistingInterfaces(
  interfacesPath: string,
): Promise<void[]> {
  const files: string[] = await readDir(interfacesPath);
  return Promise.all(
    Object.values(files).map((file) =>
      removeFile(path.join(interfacesPath, file)),
    ),
  );
}

function appendTitles(openApiSpec: OpenAPIObject): void {
  Object.entries(openApiSpec.components.schemas).forEach(([name, schema]) => {
    const objectSchema: any = schema;
    if (objectSchema.type) {
      objectSchema.title = objectSchema.title || name;
      if (
        objectSchema.type === 'string' &&
        objectSchema.enum &&
        !objectSchema.tsEnumNames
      ) {
        objectSchema.tsEnumNames = objectSchema.enum.map((e: string) =>
          snakeCase(e).toUpperCase(),
        );
      }
    }
  });
}

export async function generate(
  openApiFilePath = './openapi.json',
  interfacesDirPath = './interfaces',
  logLevel = LogLevel.NONE,
): Promise<void> {
  loggingLevel = logLevel;
  try {
    const swaggerSpec: OpenAPIObject = JSON.parse(
      await readFile(openApiFilePath),
    );
    appendTitles(swaggerSpec);
    await removeExistingInterfaces(interfacesDirPath);
    await openApiToInterfaces(swaggerSpec, interfacesDirPath);
    logSuccess('Typescript interfaces generated');
  } catch (error) {
    logError(error.message);
  }
}
