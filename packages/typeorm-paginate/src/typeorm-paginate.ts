import { ObjectLiteral, Repository, FindOptionsWhere } from 'typeorm';

const DEFAULT_PAGINATION_LIMIT = 100;

type PaginatedRow<T> = T & { index: number; progress: number };

export async function* rows<T extends ObjectLiteral>(options: {
  repository: Repository<T>;
  where: FindOptionsWhere<T> | FindOptionsWhere<T>[];
  limit?: number;
  offset?: number;
}): AsyncGenerator<PaginatedRow<T>> {
  const { repository, where, limit = DEFAULT_PAGINATION_LIMIT } = options;
  let { offset = 0 } = options;
  const total = await repository.count({ where });
  let index = 0;
  while (offset < total) {
    const rows = await repository.find({
      where: { ...where },
      skip: offset,
      take: limit,
    });
    offset += limit;
    for (const row of rows) {
      index++;
      const result: PaginatedRow<T> = Object.assign({}, row, {
        index,
        progress: index === total ? 100 : Number((index / total).toFixed(2)) * 100,
      });
      yield result;
    }
  }
}

export async function* set<T extends ObjectLiteral>(options: {
  repository: Repository<T>;
  where: FindOptionsWhere<T> | FindOptionsWhere<T>[];
  limit?: number;
}): AsyncGenerator<T[]> {
  const { repository, where, limit = DEFAULT_PAGINATION_LIMIT } = options;
  const total = await repository.count({ where });
  let offset = 0;
  while (offset < total) {
    const rows = await repository.find({
      where: { ...where },
      skip: offset,
      take: limit,
    });
    offset += limit;
    yield rows;
  }
}
