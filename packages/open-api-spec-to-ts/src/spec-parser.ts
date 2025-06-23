import { OpenAPIObject } from '@nestjs/swagger';
import { ReferenceObject, SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { compile, Options as JSONToTSOptions } from 'json-schema-to-typescript';
import { NormalizedJSONSchema } from 'json-schema-to-typescript/dist/src/types/JSONSchema';
import { flatten, snakeCase } from 'lodash';
import * as path from 'path';
import { appendFile, readDir, readFile, removeFile, writeFile } from './files';
import chalk from 'chalk';

type TsInterface = { filePath: string; name: string; content: string };

export enum LogLevel {
  NONE,
  ERROR,
  INFO,
}

export interface Options extends JSONToTSOptions {
  verbosity: LogLevel;
}

let baseOptions: Options = {
   verbosity: LogLevel.NONE,
   bannerComment: '',
   cwd: process.cwd(),
   declareExternallyReferenced: false,
   enableConstEnums: false,
   ignoreMinAndMaxItems: false,
   unknownAny: false,
   unreachableDefinitions: false,
   strictIndexSignatures: false,
   style: {
      bracketSpacing: true,
      printWidth: 120,
      semi: true,
      singleQuote: true,
      tabWidth: 4,
      useTabs: false,
   },
   $refOptions: {},
   additionalProperties: false,
   inferStringEnumKeysFromValues: false,
   format: false,
   maxItems: 0
};

function logInfo(message: any) {
  if (baseOptions.verbosity >= LogLevel.INFO) {
    console.log(chalk.cyan.bold(message), 'SpecParser');
  }
}

function logSuccess(message: any) {
  if (baseOptions.verbosity >= LogLevel.INFO) {
    console.log(chalk.green.bold(message), 'SpecParser');
  }
}

function logError(message: any) {
  if (baseOptions.verbosity >= LogLevel.ERROR) {
    console.log(chalk.red.bold(message), 'SpecParser');
  }
}

function extractRefsFromSchema(inputSchema: SchemaObject | ReferenceObject): string | string[] {
  const objectSchema = inputSchema as SchemaObject;
  const refSchema = inputSchema as ReferenceObject;
  switch (objectSchema.type) {
    case 'object':
      return Object.values(preprocessProperties(objectSchema.properties));
    case 'array':
      return extractRefsFromSchema(objectSchema.items);
    default:
      if (objectSchema.oneOf) {
        return flatten(Object.values(objectSchema.oneOf).map((item) => extractRefsFromSchema(item)));
      }
      if (objectSchema.anyOf) {
        return flatten(Object.values(objectSchema.anyOf).map((item) => extractRefsFromSchema(item)));
      }
      if (objectSchema.allOf) {
        return flatten(Object.values(objectSchema.anyOf).map((item) => extractRefsFromSchema(item)));
      }
      return refSchema.$ref || undefined;
  }
}

function preprocessProperties(inputProperties: { [key: string]: SchemaObject | ReferenceObject }) {
  if (inputProperties) {
    return Object.entries(inputProperties).reduce((acc, [name, value]) => ({ ...acc, [name]: extractRefsFromSchema(value) }), {});
  }
  return {};
}

async function createImport(name: string, schema: SchemaObject | ReferenceObject, filePath: string) {
  const references: any = extractRefsFromSchema(schema);
  if (!references || !references.length) {
    return [];
  }
  const refsArray: string[] = typeof references === 'string' ? [references] : references.flat();
  const $refs = refsArray.filter((val, index) => val !== undefined && refsArray.indexOf(val) === index).map((val) => val.split('/')[3]);

  const imports = $refs.filter((val) => !val.includes(name));
  if ($refs.length && imports.length) {
    await appendFile(filePath, `import { ${imports.join(', ')} } from './'; \n\n`);
  }
  return $refs;
}

async function createInterfaceFile(name: string, interfacesDirPath: string): Promise<string> {
  const bannerComment = '/* tslint:disable */\n/**\n* This file was automatically generated.\n* DO NOT MODIFY IT BY HAND.\n*/\n\n';
  const filePath = `${interfacesDirPath}/${name}.ts`;
  await writeFile(filePath, bannerComment);
  return filePath;
}

function removeEnum(content: string): string {
  const enumStartPosition = content.search('export enum');
  const interfaceStartPosition = content.search('export interface');
  if (enumStartPosition > -1 && interfaceStartPosition > -1) {
    const enumEndPosition = content.slice(enumStartPosition, content.length).indexOf('}') + enumStartPosition;
    const enumParts = content.slice(enumStartPosition, enumEndPosition + 1);
    content = content.replace(enumParts, '').trim();
    return removeEnum(content);
  }
  return content;
}

function checkSelfReference(name: string, content: string): string {
  const interfaceStartPosition = content.search('export interface');
  const interfaceEndPosition = content.slice(interfaceStartPosition, content.length).indexOf('}') + interfaceStartPosition;
  const interfaceParts = content.slice(interfaceStartPosition, interfaceEndPosition + 1).split('{');
  const selfRefIndex = interfaceParts[1].indexOf(name);
  if (selfRefIndex > -1) {
    const selfRef = interfaceParts[1].slice(selfRefIndex, selfRefIndex + name.length + 1);
    const regex = new RegExp(selfRef, 'g');
    content = content.replace(regex, name);
  }
  return content;
}

async function createInterfaceContent(name: string, openApiSpec: OpenAPIObject, filePath: string): Promise<string> {
  const components = openApiSpec.components;
  const schema = openApiSpec.components.schemas[name];

  const dependencies = await createImport(name, schema, filePath);

  const schemaAndDefinitions = {
    ...schema,
    components,
  };
  let content = await compile(schemaAndDefinitions as unknown as NormalizedJSONSchema, name, baseOptions);

  // TODO: check future updates from json-schema-to-typescript, as next step should not be needed
  if (!baseOptions.declareExternallyReferenced) {
    content = removeEnum(content);
  }
  if (dependencies.includes(name)) {
    content = checkSelfReference(name, content);
  }
  await appendFile(filePath, content);
  return content;
}

async function createInterface(name: string, openApiSpec: OpenAPIObject, interfacesDirPath: string): Promise<TsInterface> {
  await appendFile(`${interfacesDirPath}/index.ts`, `export * from './${name}';\n`);
  const filePath = await createInterfaceFile(name, interfacesDirPath);
  const content = await createInterfaceContent(name, openApiSpec, filePath);
  logInfo(`${name} interface generated`);
  return { content, filePath, name };
}

async function parseSchema(name: string, openApiSpec: OpenAPIObject, interfacesDirPath: string): Promise<TsInterface | null> {
  const components = openApiSpec?.components;
  if (!components || !components.schemas || !components.schemas.hasOwnProperty(name)) {
    return null;
  }
  const schema = components.schemas[name];
  return schema ? createInterface(name, openApiSpec, interfacesDirPath) : null;
}

function delayedParsing(schemaKey: string, openApiSpec: OpenAPIObject, interfacesDirPath: string, ms: number): Promise<TsInterface | null> {
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

async function openApiToInterfaces(openApiSpec: OpenAPIObject, interfacesDirPath: string): Promise<void> {
  const schemasNames = Object.keys(openApiSpec.components.schemas).sort();
  await schemasNames.reduce(async (prevPromise, schemaKey) => {
    try {
      await prevPromise;
      return delayedParsing(schemaKey, openApiSpec, interfacesDirPath, 0);
    } catch (error) {
      logError(error.message);
      return Promise.resolve({} as TsInterface);
    }
  }, Promise.resolve({} as TsInterface));
}

async function removeExistingInterfaces(interfacesPath: string): Promise<void[]> {
  const files: string[] = await readDir(interfacesPath);
  return Promise.all(Object.values(files).map((file) => removeFile(path.join(interfacesPath, file))));
}

function appendTitles(openApiSpec: OpenAPIObject): void {
  Object.entries(openApiSpec.components.schemas).forEach(([name, schema]) => {
    const objectSchema: any = schema;
    if (objectSchema.type) {
      objectSchema.title = objectSchema.title || name;
      if (objectSchema.type === 'string' && objectSchema.enum && !objectSchema.tsEnumNames) {
        objectSchema.tsEnumNames = objectSchema.enum.map((e: string) => snakeCase(e).toUpperCase());
      }
    }
  });
}

export async function generate(
  openApiFilePath = './openapi.json',
  interfacesDirPath = './interfaces',
  options: Partial<Options> = {},
): Promise<void> {
  baseOptions = { ...baseOptions, ...options };
  try {
    const swaggerSpec: OpenAPIObject = JSON.parse(await readFile(openApiFilePath));
    appendTitles(swaggerSpec);
    await removeExistingInterfaces(interfacesDirPath);
    await openApiToInterfaces(swaggerSpec, interfacesDirPath);
    logSuccess('Typescript interfaces generated');
  } catch (error) {
    logError(error.message);
    throw error;
  }
}
