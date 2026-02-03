import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiHeader,
} from '@nestjs/swagger';
import { UserService, PaginationResult } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginateUserDto } from './dto/paginate-user.dto';
import { User } from '../../entities/user.entity';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('users')
@Controller('users')
@UseGuards(RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.userService.create(createUserDto);
  }

  @Post('upsert')
  @ApiOperation({
    summary: 'Upsert a user (insert or update based on email)',
    description: 'Demonstrates @nest-toolbox/typeorm-upsert package',
  })
  @ApiResponse({ status: 201, description: 'User upserted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  upsert(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.userService.upsert(createUserDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get paginated list of users',
    description: 'Demonstrates @nest-toolbox/typeorm-paginate package',
  })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  findAll(@Query() paginateDto: PaginateUserDto): Promise<PaginationResult<User>> {
    return this.userService.findAll(paginateDto);
  }

  @Get('deleted')
  @ApiOperation({
    summary: 'Get soft-deleted users',
    description: 'Demonstrates @nest-toolbox/typeorm-soft-delete package',
  })
  @ApiResponse({ status: 200, description: 'Deleted users retrieved successfully' })
  findDeleted(): Promise<User[]> {
    return this.userService.findDeleted();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: string): Promise<User> {
    return this.userService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a user' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto): Promise<User> {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id/soft')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Soft delete a user (Admin only)',
    description: 'Demonstrates @nest-toolbox/typeorm-soft-delete and access control packages',
  })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiHeader({ name: 'x-user-role', description: 'User role (admin required)', required: true })
  @ApiResponse({ status: 204, description: 'User soft deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  softDelete(@Param('id') id: string): Promise<void> {
    return this.userService.softDelete(id);
  }

  @Post(':id/restore')
  @ApiOperation({
    summary: 'Restore a soft-deleted user',
    description: 'Demonstrates @nest-toolbox/typeorm-soft-delete package',
  })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User restored successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  restore(@Param('id') id: string): Promise<User> {
    return this.userService.restore(id);
  }

  @Delete(':id/force')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Permanently delete a user',
    description: 'Demonstrates @nest-toolbox/typeorm-soft-delete package',
  })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 204, description: 'User permanently deleted' })
  @ApiResponse({ status: 404, description: 'User not found' })
  forceDelete(@Param('id') id: string): Promise<void> {
    return this.userService.forceDelete(id);
  }
}
