import { Repository } from 'typeorm';

export type UpsertStatus = 'inserted' | 'updated';

export interface UpsertResult<T> {
  entity: T;
  status: UpsertStatus;
}

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
export async function TypeOrmUpsert<T>(
  repository: Repository<T> | Repository<any> | any,
  object: T | T[],
  conflictKey: string,
  options?: {
    keyNamingTransform?: (k: string) => string;
    doNotUpsert?: string[];
    chunk?: number;
    returnStatus?: boolean;
  },
): Promise<T[] | T | UpsertResult<T>[] | UpsertResult<T> | any> {
  options = options ? options : {};
  const chunk = options.chunk ?? 1000;
  const keyNamingTransform = options.keyNamingTransform ?? ((k) => k);
  const doNotUpsert = options.doNotUpsert ?? [];
  const returnStatus = options.returnStatus ?? false;
  const sampleObject = Array.isArray(object) ? object[0] : object;
  const keys: string[] = _keys({ sampleObject, doNotUpsert });
  const setterString = _generateSetterString({ keys, keyNamingTransform });
  const onConflict = `("${conflictKey}") DO UPDATE SET ${setterString}`;
  // Ensure object is always an array for chunking
  const valuesArray = Array.isArray(object) ? object : [object];
  const chunkedValues = _chunkValues({ values: valuesArray, chunk });
  
  const results = (await _chunkPromises({ repository, chunkedValues, onConflict, returnStatus, conflictKey })).reduce((acc, current) => {
    return acc.concat(current?.raw || []);
  }, []);

  if (returnStatus) {
    // Return results with status
    const resultsWithStatus: UpsertResult<T>[] = results.map((result: any) => {
      const { _upsert_status, ...entity } = result;
      return {
        entity: entity as T,
        status: _upsert_status as UpsertStatus,
      };
    });
    return Array.isArray(object) ? resultsWithStatus : resultsWithStatus[0];
  }
  
  // Return entities without status (backward compatibility)
  const entities = results.map((result: any) => {
    const { _upsert_status, ...entity } = result;
    return entity;
  });
  
  return Array.isArray(object) ? entities : entities[0];
}

export async function _chunkPromises({ repository, chunkedValues, onConflict, returnStatus, conflictKey }) {
  const promises = [];
  for (let i = 0; i < chunkedValues.length; i++) {
    let existingKeys: Set<string | number> = new Set();
    
    if (returnStatus) {
      // Query existing records to determine which will be inserted vs updated
      const conflictValues = chunkedValues[i].map((item: any) => item[conflictKey]).filter((val: any) => val != null);
      if (conflictValues.length > 0) {
        const existingRecords = await repository
          .createQueryBuilder()
          .select(conflictKey)
          .where(`${conflictKey} IN (:...ids)`, { ids: conflictValues })
          .getRawMany();
        existingKeys = new Set(existingRecords.map((record: any) => record[conflictKey]));
      }
    }
    
    const saveQuery = repository.createQueryBuilder().insert().values(chunkedValues[i]).onConflict(onConflict).returning('*').execute();
    
    promises.push(
      saveQuery.then((result: any) => {
        if (returnStatus && result.raw) {
          // Add status to each result
          result.raw = result.raw.map((row: any) => {
            const keyValue = row[conflictKey];
            const status: UpsertStatus = existingKeys.has(keyValue) ? 'updated' : 'inserted';
            return {
              ...row,
              _upsert_status: status,
            };
          });
        }
        return result;
      }).catch((e) => {
        console.error(e);
      }),
    );
  }
  return await Promise.all(promises);
}

export function _chunkValues({ values, chunk }) {
  const chunked_arr = [];
  // Ensure values is an array
  const valuesArray = Array.isArray(values) ? values : [values];
  let copied = [...valuesArray];
  const numOfChild = Math.ceil(copied.length / chunk);
  for (let i = 0; i < numOfChild; i++) {
    chunked_arr.push(copied.splice(0, chunk));
  }
  return chunked_arr;
}

export function _keys({ sampleObject, doNotUpsert }) {
  return [Object.keys(sampleObject), doNotUpsert].reduce((a, b) => a.filter((c) => !b.includes(c)));
}

export function _generateSetterString({ keys, keyNamingTransform }) {
  const isCamelCase = (k: string) => /^[a-z]+[A-Z]/.test(k);
  const setterString = keys.map((k) => {
    if (isCamelCase(k)) {
      return `"${keyNamingTransform(k)}"=EXCLUDED."${k}"`;
    }
    return `${keyNamingTransform(k)}=EXCLUDED.${k}`;
  });
  // Always update updatedAt to current timestamp
  setterString.push('"updatedAt"=CURRENT_TIMESTAMP');
  return setterString.join(' , ');
}
