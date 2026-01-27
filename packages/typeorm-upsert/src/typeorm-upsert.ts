import { Repository } from 'typeorm';

/*
 * ⚠️ PostgreSQL compatible only ⚠️
 * Repository - TypeORM Repository
 * object - Object to upsert or an array of objects
 * keyNamingTransform (optional) - Transformation to apply to key names before upsert
 * doNotUpsert - Keys to exclude from upsert. This is useful if a non-nullable field is required in case
 * the row does not already exist but you do not want to overwrite this field if it already exists
 */
export async function TypeOrmUpsert<T>(
  repository: Repository<T> | Repository<any> | any,
  object: T | T[],
  conflictKey: string,
  options?: {
    keyNamingTransform?: (k: string) => string;
    doNotUpsert?: string[];
    chunk?: number;
  },
): Promise<T[] | T | any> {
  options = options ? options : {};
  const chunk = options.chunk ?? 1000;
  const keyNamingTransform = options.keyNamingTransform ?? ((k) => k);
  const doNotUpsert = options.doNotUpsert ?? [];
  const sampleObject = Array.isArray(object) ? object[0] : object;
  const keys: string[] = _keys({ sampleObject, doNotUpsert });
  const setterString = _generateSetterString({ keys, keyNamingTransform });
  const onConflict = `("${conflictKey}") DO UPDATE SET ${setterString}`;
  const chunkedValues = _chunkValues({ values: object, chunk });
  return (await _chunkPromises({ repository, chunkedValues, onConflict })).reduce((acc, current) => {
    return acc.concat(current?.raw);
  }, []);
}

export async function _chunkPromises({ repository, chunkedValues, onConflict }) {
  const promises = [];
  for (let i = 0; i < chunkedValues.length; i++) {
    const saveQuery = repository.createQueryBuilder().insert().values(chunkedValues[i]).onConflict(onConflict).returning('*').execute();
    promises.push(
      saveQuery.catch((e) => {
        console.error(e);
      }),
    );
  }
  return await Promise.all(promises);
}

export function _chunkValues({ values, chunk }) {
  const chunked_arr = [];
  let copied = [...values];
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
