import { existsSync, mkdirSync } from 'node:fs';
import * as path from 'node:path';
import type { OpenAPIObject } from '@nestjs/swagger';
import type { ReferenceObject, SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import chalk from 'chalk';
import { compile, type JSONSchema, type Options as JSONToTSOptions } from 'json-schema-to-typescript';
import { flatten, snakeCase } from 'lodash';
import { appendFile, readDir, readFile, removeFile, writeFile } from './files';

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
  additionalProperties: true,
  bannerComment: '',
  cwd: process.cwd(),
  declareExternallyReferenced: false,
  enableConstEnums: false,
  format: true,
  ignoreMinAndMaxItems: false,
  inferStringEnumKeysFromValues: false,
  maxItems: 20,
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
};

function logInfo(message: string) {
  if (baseOptions.verbosity >= LogLevel.INFO) {
    console.log(chalk.cyan.bold(message), 'SpecParser');
  }
}

function logSuccess(message: string) {
  if (baseOptions.verbosity >= LogLevel.INFO) {
    console.log(chalk.green.bold(message), 'SpecParser');
  }
}

function logError(message: string) {
  if (baseOptions.verbosity >= LogLevel.ERROR) {
    console.log(chalk.red.bold(message), 'SpecParser');
  }
}

// Collect $refs by schema structure rather than `type`, since `type` is optional in OpenAPI
function extractRefsFromSchema(inputSchema: SchemaObject | ReferenceObject | undefined): string[] {
  if (!inputSchema) {
    return [];
  }
  const refSchema = inputSchema as ReferenceObject;
  if (refSchema.$ref) {
    return [refSchema.$ref];
  }
  const objectSchema = inputSchema as SchemaObject;
  const children: (SchemaObject | ReferenceObject | undefined)[] = [
    ...Object.values(objectSchema.properties ?? {}),
    typeof objectSchema.additionalProperties === 'object' ? objectSchema.additionalProperties : undefined,
    objectSchema.items,
    ...(objectSchema.oneOf ?? []),
    ...(objectSchema.anyOf ?? []),
    ...(objectSchema.allOf ?? []),
  ];
  return flatten(children.map((child) => extractRefsFromSchema(child)));
}

async function createImport(name: string, schema: SchemaObject | ReferenceObject, filePath: string) {
  const references = extractRefsFromSchema(schema);
  if (!references.length) {
    return [];
  }
  const $refs = references.filter((val, index) => references.indexOf(val) === index).map((val) => val.split('/')[3]);

  const imports = $refs.filter((val) => val !== name);
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
  if (!components?.schemas) {
    throw new Error('OpenAPI spec must have components.schemas');
  }
  const schema = components.schemas[name];

  const dependencies = await createImport(name, schema, filePath);

  const schemaAndDefinitions = {
    ...schema,
    components,
  } as unknown as JSONSchema;
  let content = await compile(schemaAndDefinitions, name, baseOptions);

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
  if (!components?.schemas || !Object.hasOwn(components.schemas, name)) {
    return null;
  }
  const schema = components.schemas[name];
  return schema ? createInterface(name, openApiSpec, interfacesDirPath) : null;
}

async function openApiToInterfaces(openApiSpec: OpenAPIObject, interfacesDirPath: string): Promise<void> {
  if (!openApiSpec.components?.schemas) {
    return;
  }
  const schemasNames = Object.keys(openApiSpec.components.schemas).sort();
  for (const schemaKey of schemasNames) {
    try {
      await parseSchema(schemaKey, openApiSpec, interfacesDirPath);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logError(errorMessage);
    }
  }
}

function ensureDirectoryExists(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

async function removeExistingInterfaces(interfacesPath: string): Promise<void> {
  // Check if directory exists before trying to read it
  if (!existsSync(interfacesPath)) {
    return;
  }
  const files = await readDir(interfacesPath);
  if (!files || files.length === 0) {
    return;
  }
  await Promise.all(files.map((file) => removeFile(path.join(interfacesPath, file))));
}

function appendTitles(openApiSpec: OpenAPIObject): void {
  if (!openApiSpec.components?.schemas) {
    return;
  }
  Object.entries(openApiSpec.components.schemas).forEach(([name, schema]) => {
    const objectSchema = schema as SchemaObject & { tsEnumNames?: string[] };
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
    // Ensure the interfaces directory exists before writing files
    ensureDirectoryExists(interfacesDirPath);
    await removeExistingInterfaces(interfacesDirPath);
    await openApiToInterfaces(swaggerSpec, interfacesDirPath);
    logSuccess('Typescript interfaces generated');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError(errorMessage);
    throw error;
  }
}
