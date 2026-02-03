import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TypeOrmUpsert } from '@nest-toolbox/typeorm-upsert';
import { rows } from '@nest-toolbox/typeorm-paginate';
import { SoftDelete } from '@nest-toolbox/typeorm-soft-delete';
import { User } from '../../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginateUserDto } from './dto/paginate-user.dto';

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
    const result = await upsert(
      this.userRepository,
      createUserDto,
      ['email'],
      ['firstName', 'lastName', 'role', 'isActive'],
    );
    return result.raw[0];
  }

  async findAll(paginateDto: PaginateUserDto): Promise<PaginationResult<User>> {
    const queryBuilder = this.userRepository.createQueryBuilder('user');

    if (paginateDto.sortBy) {
      queryBuilder.orderBy(`user.${paginateDto.sortBy}`, paginateDto.sortOrder);
    }

    return paginate<User>(queryBuilder, {
      page: paginateDto.page,
      limit: paginateDto.limit,
    });
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
    const user = await this.findOne(id);
    await softDelete(this.userRepository, user.id);
  }

  async restore(id: string): Promise<User> {
    await restore(this.userRepository, id);
    return this.findOne(id);
  }

  async forceDelete(id: string): Promise<void> {
    await forceDelete(this.userRepository, id);
  }

  async findDeleted(): Promise<User[]> {
    return this.userRepository
      .createQueryBuilder('user')
      .where('user.deletedAt IS NOT NULL')
      .withDeleted()
      .getMany();
  }
}
