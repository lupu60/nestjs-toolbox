import { existsSync, mkdirSync } from "node:fs";
import * as path from "node:path";
import type { OpenAPIObject } from "@nestjs/swagger";
import type {
	ReferenceObject,
	SchemaObject,
} from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";
import * as chalk from "chalk";
import { compile, type Options as JSONToTSOptions } from "json-schema-to-typescript";
import type { NormalizedJSONSchema } from "json-schema-to-typescript/dist/src/types/JSONSchema";
import { flatten, snakeCase } from "lodash";
import { appendFile, readDir, readFile, removeFile, writeFile } from "./files";

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
	bannerComment: "",
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
};

function logInfo(message: any) {
	if (baseOptions.verbosity >= LogLevel.INFO) {
		console.log(chalk.cyan.bold(message), "SpecParser");
	}
}

function logSuccess(message: any) {
	if (baseOptions.verbosity >= LogLevel.INFO) {
		console.log(chalk.green.bold(message), "SpecParser");
	}
}

function logError(message: any) {
	if (baseOptions.verbosity >= LogLevel.ERROR) {
		console.log(chalk.red.bold(message), "SpecParser");
	}
}

function extractRefsFromSchema(
	inputSchema: SchemaObject | ReferenceObject,
): string | string[] | undefined {
	const objectSchema = inputSchema as SchemaObject;
	const refSchema = inputSchema as ReferenceObject;
	switch (objectSchema.type) {
		case "object":
			if (!objectSchema.properties) {
				return undefined;
			}
			return Object.values(preprocessProperties(objectSchema.properties));
		case "array":
			if (!objectSchema.items) {
				return undefined;
			}
			return extractRefsFromSchema(objectSchema.items);
		default:
			if (objectSchema.oneOf) {
				const refs = Object.values(objectSchema.oneOf)
					.map((item) => extractRefsFromSchema(item))
					.filter((ref): ref is string | string[] => ref !== undefined);
				return flatten(refs);
			}
			if (objectSchema.anyOf) {
				const refs = Object.values(objectSchema.anyOf)
					.map((item) => extractRefsFromSchema(item))
					.filter((ref): ref is string | string[] => ref !== undefined);
				return flatten(refs);
			}
			if (objectSchema.allOf) {
				const refs = Object.values(objectSchema.allOf)
					.map((item) => extractRefsFromSchema(item))
					.filter((ref): ref is string | string[] => ref !== undefined);
				return flatten(refs);
			}
			return refSchema.$ref;
	}
}

function preprocessProperties(inputProperties: { [key: string]: SchemaObject | ReferenceObject }) {
	if (inputProperties) {
		return Object.entries(inputProperties).reduce(
			(acc, [name, value]) => ({
				...acc,
				[name]: extractRefsFromSchema(value),
			}),
			{},
		);
	}
	return {};
}

async function createImport(
	name: string,
	schema: SchemaObject | ReferenceObject,
	filePath: string,
) {
	const references: any = extractRefsFromSchema(schema);
	if (!references || !references.length) {
		return [];
	}
	const refsArray: string[] = typeof references === "string" ? [references] : references.flat();
	const $refs = refsArray
		.filter((val, index) => val !== undefined && refsArray.indexOf(val) === index)
		.map((val) => val.split("/")[3]);

	const imports = $refs.filter((val) => !val.includes(name));
	if ($refs.length && imports.length) {
		await appendFile(filePath, `import { ${imports.join(", ")} } from './'; \n\n`);
	}
	return $refs;
}

async function createInterfaceFile(name: string, interfacesDirPath: string): Promise<string> {
	const bannerComment =
		"/* tslint:disable */\n/**\n* This file was automatically generated.\n* DO NOT MODIFY IT BY HAND.\n*/\n\n";
	const filePath = `${interfacesDirPath}/${name}.ts`;
	await writeFile(filePath, bannerComment);
	return filePath;
}

function removeEnum(content: string): string {
	const enumStartPosition = content.search("export enum");
	const interfaceStartPosition = content.search("export interface");
	if (enumStartPosition > -1 && interfaceStartPosition > -1) {
		const enumEndPosition =
			content.slice(enumStartPosition, content.length).indexOf("}") + enumStartPosition;
		const enumParts = content.slice(enumStartPosition, enumEndPosition + 1);
		content = content.replace(enumParts, "").trim();
		return removeEnum(content);
	}
	return content;
}

function checkSelfReference(name: string, content: string): string {
	const interfaceStartPosition = content.search("export interface");
	const interfaceEndPosition =
		content.slice(interfaceStartPosition, content.length).indexOf("}") + interfaceStartPosition;
	const interfaceParts = content.slice(interfaceStartPosition, interfaceEndPosition + 1).split("{");
	const selfRefIndex = interfaceParts[1].indexOf(name);
	if (selfRefIndex > -1) {
		const selfRef = interfaceParts[1].slice(selfRefIndex, selfRefIndex + name.length + 1);
		const regex = new RegExp(selfRef, "g");
		content = content.replace(regex, name);
	}
	return content;
}

async function createInterfaceContent(
	name: string,
	openApiSpec: OpenAPIObject,
	filePath: string,
): Promise<string> {
	const components = openApiSpec.components;
	if (!components || !components.schemas) {
		throw new Error("OpenAPI spec must have components.schemas");
	}
	const schema = components.schemas[name];

	const dependencies = await createImport(name, schema, filePath);

	const schemaAndDefinitions = {
		...schema,
		components,
	} as NormalizedJSONSchema;
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

async function createInterface(
	name: string,
	openApiSpec: OpenAPIObject,
	interfacesDirPath: string,
): Promise<TsInterface> {
	await appendFile(`${interfacesDirPath}/index.ts`, `export * from './${name}';\n`);
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
	if (!components || !components.schemas || !Object.hasOwn(components.schemas, name)) {
		return null;
	}
	const schema = components.schemas[name];
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
	if (!openApiSpec.components || !openApiSpec.components.schemas) {
		return;
	}
	const schemasNames = Object.keys(openApiSpec.components.schemas).sort();
	let prevPromise: Promise<TsInterface | null> = Promise.resolve(null);
	for (const schemaKey of schemasNames) {
		try {
			await prevPromise;
			prevPromise = delayedParsing(schemaKey, openApiSpec, interfacesDirPath, 0);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			logError(errorMessage);
			prevPromise = Promise.resolve(null);
		}
	}
	await prevPromise;
}

function ensureDirectoryExists(dirPath: string): void {
	if (!existsSync(dirPath)) {
		mkdirSync(dirPath, { recursive: true });
	}
}

async function removeExistingInterfaces(interfacesPath: string): Promise<undefined[]> {
	// Check if directory exists before trying to read it
	if (!existsSync(interfacesPath)) {
		return Promise.resolve([]);
	}
	const files = await readDir(interfacesPath);
	if (!files || files.length === 0) {
		return Promise.resolve([]);
	}
	return Promise.all(files.map((file) => removeFile(path.join(interfacesPath, file))));
}

function appendTitles(openApiSpec: OpenAPIObject): void {
	if (!openApiSpec.components || !openApiSpec.components.schemas) {
		return;
	}
	Object.entries(openApiSpec.components.schemas).forEach(([name, schema]) => {
		const objectSchema: any = schema;
		if (objectSchema.type) {
			objectSchema.title = objectSchema.title || name;
			if (objectSchema.type === "string" && objectSchema.enum && !objectSchema.tsEnumNames) {
				objectSchema.tsEnumNames = objectSchema.enum.map((e: string) => snakeCase(e).toUpperCase());
			}
		}
	});
}

export async function generate(
	openApiFilePath = "./openapi.json",
	interfacesDirPath = "./interfaces",
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
		logSuccess("Typescript interfaces generated");
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logError(errorMessage);
		throw error;
	}
}
