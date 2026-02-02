import type { ObjectLiteral, Repository } from 'typeorm';

export type UpsertStatus = 'inserted' | 'updated';

export interface UpsertResult<T> {
  entity: T;
  status: UpsertStatus;
}

const DEFAULT_CHUNK_SIZE = 1000;
const UPDATED_AT_COLUMN = 'updatedAt';

/*
 * ⚠️ PostgreSQL compatible only ⚠️
 * Repository - TypeORM Repository
 * object - Object to upsert or an array of objects
 * conflictKey - Column name(s) that define the unique constraint
 * options - Optional configuration
 *   keyNamingTransform - Transformation to apply to key names before upsert
 *   doNotUpsert - Keys to exclude from upsert. This is useful if a non-nullable field is required in case
 *     the row does not already exist but you do not want to overwrite this field if it already exists
 *   chunk - Number of records to process per batch
 *   returnStatus - If true, returns array of UpsertResult with status (inserted/updated) for each entity
 */
export async function TypeOrmUpsert<T extends ObjectLiteral>(
  repository: Repository<T>,
  object: T | T[],
  conflictKey: string,
  options?: {
    keyNamingTransform?: (k: string) => string;
    doNotUpsert?: string[];
    chunk?: number;
    returnStatus?: boolean;
  },
): Promise<T[] | T | UpsertResult<T>[] | UpsertResult<T>> {
  options = options ? options : {};
  const chunk = options.chunk ?? DEFAULT_CHUNK_SIZE;
  const keyNamingTransform = options.keyNamingTransform ?? ((k) => k);
  const doNotUpsert = options.doNotUpsert ?? [];
  const returnStatus = options.returnStatus ?? false;
  const sampleObject = Array.isArray(object) ? object[0] : object;
  const keys: string[] = _keys({ sampleObject: sampleObject as Record<string, unknown>, doNotUpsert });
  const setterString = _generateSetterString({ keys, keyNamingTransform });
  const onConflict = `("${conflictKey}") DO UPDATE SET ${setterString}`;
  // Ensure object is always an array for chunking
  const valuesArray = Array.isArray(object) ? object : [object];
  const chunkedValues = _chunkValues({ values: valuesArray, chunk });

  const results = (await _chunkPromises({ repository, chunkedValues, onConflict, returnStatus, conflictKey })).flatMap(
    (current) => current?.raw || [],
  );

  if (returnStatus) {
    // Return results with status
    const resultsWithStatus: UpsertResult<T>[] = results.map((result: Record<string, unknown>) => {
      const { _upsert_status, ...entity } = result;
      return {
        entity: entity as T,
        status: _upsert_status as UpsertStatus,
      };
    });
    return Array.isArray(object) ? resultsWithStatus : resultsWithStatus[0];
  }

  // Return entities without status (backward compatibility)
  const entities = results.map((result: Record<string, unknown>) => {
    const { _upsert_status, ...entity } = result;
    return entity as T;
  });

  return Array.isArray(object) ? entities : entities[0];
}

interface ChunkPromiseResult {
  raw: Array<Record<string, unknown>>;
}

export async function _chunkPromises<T extends ObjectLiteral>({
  repository,
  chunkedValues,
  onConflict,
  returnStatus,
  conflictKey,
}: {
  repository: Repository<T>;
  chunkedValues: T[][];
  onConflict: string;
  returnStatus: boolean;
  conflictKey: string;
}): Promise<ChunkPromiseResult[]> {
  const promises: Promise<ChunkPromiseResult>[] = [];
  for (let i = 0; i < chunkedValues.length; i++) {
    let existingKeys: Set<string | number> = new Set();

    if (returnStatus) {
      // Query existing records to determine which will be inserted vs updated
      const conflictValues = chunkedValues[i].map((item) => (item as Record<string, unknown>)[conflictKey]).filter((val) => val !== null);
      if (conflictValues.length > 0) {
        const existingRecords = await repository
          .createQueryBuilder()
          .select(conflictKey)
          .where(`${conflictKey} IN (:...ids)`, { ids: conflictValues })
          .getRawMany();
        existingKeys = new Set(existingRecords.map((record: Record<string, unknown>) => record[conflictKey] as string | number));
      }
    }

    const saveQuery = repository.createQueryBuilder().insert().values(chunkedValues[i]).onConflict(onConflict).returning('*').execute();

    promises.push(
      saveQuery
        .then((result: ChunkPromiseResult) => {
          if (returnStatus && result.raw) {
            // Add status to each result
            result.raw = result.raw.map((row: Record<string, unknown>) => {
              const keyValue = row[conflictKey] as string | number;
              const status: UpsertStatus = existingKeys.has(keyValue) ? 'updated' : 'inserted';
              return {
                ...row,
                _upsert_status: status,
              };
            });
          }
          return result;
        })
        .catch((e: unknown) => {
          throw new Error(`Failed to upsert chunk: ${e instanceof Error ? e.message : String(e)}`);
        }),
    );
  }
  return await Promise.all(promises);
}

export function _chunkValues<T>({ values, chunk }: { values: T[]; chunk: number }): T[][] {
  const chunked_arr: T[][] = [];
  // Ensure values is an array
  const valuesArray = Array.isArray(values) ? values : [values];
  const copied = [...valuesArray];
  const numOfChild = Math.ceil(copied.length / chunk);
  for (let i = 0; i < numOfChild; i++) {
    chunked_arr.push(copied.splice(0, chunk));
  }
  return chunked_arr;
}

export function _keys({ sampleObject, doNotUpsert }: { sampleObject: Record<string, unknown>; doNotUpsert: string[] }): string[] {
  return [Object.keys(sampleObject), doNotUpsert].reduce((a, b) => a.filter((c) => !b.includes(c)));
}

export function _generateSetterString({ keys, keyNamingTransform }: { keys: string[]; keyNamingTransform: (k: string) => string }): string {
  const isCamelCase = (k: string) => /^[a-z]+[A-Z]/.test(k);
  const setterString = keys.map((k) => {
    if (isCamelCase(k)) {
      return `"${keyNamingTransform(k)}"=EXCLUDED."${k}"`;
    }
    return `${keyNamingTransform(k)}=EXCLUDED.${k}`;
  });
  // Always update updatedAt to current timestamp
  setterString.push(`"${UPDATED_AT_COLUMN}"=CURRENT_TIMESTAMP`);
  return setterString.join(' , ');
}
