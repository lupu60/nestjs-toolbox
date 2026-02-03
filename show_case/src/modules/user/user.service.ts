import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TypeOrmUpsert } from '@nest-toolbox/typeorm-upsert';
import { softDelete, restore, forceDelete, findOnlyDeleted } from '@nest-toolbox/typeorm-soft-delete';
import { User } from '../../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginateUserDto } from './dto/paginate-user.dto';

export interface PaginationMeta {
  page: number;
  take: number;
  itemCount: number;
  pageCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface PaginationResult<T> {
  data: T[];
  meta: PaginationMeta;
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(createUserDto);
    return this.userRepository.save(user);
  }

  async upsert(createUserDto: CreateUserDto): Promise<User> {
    const result = await TypeOrmUpsert<User>(
      this.userRepository,
      createUserDto as User,
      'email',
    );
    
    // TypeOrmUpsert returns T | T[] | UpsertResult<T> | UpsertResult<T>[]
    // We need to extract the User entity
    if (Array.isArray(result)) {
      return result[0] as User;
    }
    return result as User;
  }

  async findAll(paginateDto: PaginateUserDto): Promise<PaginationResult<User>> {
    const page = paginateDto.page || 1;
    const limit = paginateDto.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.userRepository.createQueryBuilder('user');

    if (paginateDto.sortBy) {
      queryBuilder.orderBy(`user.${paginateDto.sortBy}`, paginateDto.sortOrder);
    }

    const [data, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const pageCount = Math.ceil(total / limit);

    return {
      data,
      meta: {
        page,
        take: limit,
        itemCount: data.length,
        pageCount,
        hasPreviousPage: page > 1,
        hasNextPage: page < pageCount,
      },
    };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  async softDelete(id: string): Promise<void> {
    await this.findOne(id); // Verify user exists
    await softDelete(this.userRepository, id);
  }

  async restore(id: string): Promise<User> {
    await restore(this.userRepository, id);
    // After restore, query with withDeleted to get the restored entity
    const user = await this.userRepository.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async forceDelete(id: string): Promise<void> {
    await forceDelete(this.userRepository, id);
  }

  async findDeleted(): Promise<User[]> {
    return findOnlyDeleted(this.userRepository, {});
  }
}
