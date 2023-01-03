import { Repository } from 'typeorm';
import { Merge } from 'type-fest';

export async function* rows<T>(options: {
  repository: Repository<T>;
  where: any;
  limit?: number;
  offset?: number;
}): AsyncGenerator<Merge<T, { index: number; progress: number }>> {
  const { repository, where, limit = 100 } = options;
  let { offset = 0 } = options;
  const total = await repository.count(where);
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
      yield { ...row, index, progress: index === total ? 100 : Number((index / total).toFixed(2)) * 100 } as any;
    }
  }
}

export async function* set<T>(options: { repository: Repository<T>; where: any; limit?: number }): AsyncGenerator<T[]> {
  const { repository, where, limit = 100 } = options;
  const total = await repository.count(where);
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
