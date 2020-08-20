import * as _ from 'lodash';
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
    repository: Repository<T>,
    object: T | T[],
    conflictKey: string,
    options?: {
        keyNamingTransform?: (k: string) => string;
        doNotUpsert?: string[];
    },
): Promise<T | T[]> {
    options = options ? options : {};
    const keyNamingTransform = options.keyNamingTransform ?? ((k) => k);
    const doNotUpsert = options.doNotUpsert ?? [];
    const isCamelCase = (k: string) => /^[a-z]+[A-Z]/.test(k);
    const sampleObject = _.isArray(object) ? object[0] : object;
    const keys: string[] = _.difference(_.keys(sampleObject), doNotUpsert);
    const setterString = keys.map((k) => {
        if (isCamelCase(k)) {
            return `"${keyNamingTransform(k)}"=EXCLUDED."${k}"`;
        }
        return `${keyNamingTransform(k)}=EXCLUDED.${k}`;
    });
    const onConflict = `("${conflictKey}") DO UPDATE SET ${setterString.join(' , ')}`;
    const qb = repository.createQueryBuilder().insert().values(object).onConflict(onConflict);
    return (await qb.returning('*').execute()).raw;
}
