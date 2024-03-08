import {
  Body,
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Delete,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { User, UserRoles } from './entities/user.entity';
import { ApiTags } from '@nestjs/swagger';
import {
  AssignRoleDecorator,
  BanUserDecorator,
  DeleteCurrentUserDecorator,
  DeleteUserByIdDecorator,
  GetAllUsersDecorator,
  GetCurrentUserDecorator,
  GetUserByEmailDecorator,
  GetUserByIdDecorator,
  HardDeleteUserByIdDecorator,
  UpdateCurrentUserDecorator,
  UpdateUserByIdDecorator,
} from './decorators';
import { UpdateMeDto } from './dtos/update-me.dto';
import { UsersQueryDto } from './dtos/user-query.dto';
import { Serialize } from 'src/common/interceptors/serialize.interceptor';
import { GetAllUserDto, PaginatedUserDto } from './dtos/paginated-users.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @GetAllUsersDecorator()
  @Serialize(GetAllUserDto)
  @Get()
  async findAllUsers(@Query() query: UsersQueryDto): Promise<PaginatedUserDto> {
    return await this.usersService.findAll(query);
  }

  @GetCurrentUserDecorator()
  @Get('/me')
  getMe(@CurrentUser() user: any): Promise<User> {
    return user;
  }

  @UpdateCurrentUserDecorator()
  @Patch('/me')
  async updateCurrentUser(
    @CurrentUser() user: any,
    @Body() body: UpdateMeDto,
  ): Promise<User> {
    return await this.usersService.updateCurrentUser(user.id, body);
  }

  @DeleteCurrentUserDecorator()
  @Delete('/me')
  async removeCurrentUser(@CurrentUser() user: any): Promise<void> {
    await this.usersService.deactivate(user.id);
  }

  @BanUserDecorator()
  @Patch('/block/:userId')
  async banUser(@Param('userId') userId: string) {
    console.log(userId);
    return await this.usersService.banUser(userId);
  }

  @GetUserByEmailDecorator()
  @Get('/email/:email')
  async findUserByEmail(@Query('email') email: string) {
    return await this.usersService.findByEmail(email);
  }

  @GetUserByIdDecorator()
  @Get('/:userId')
  async findUser(@Param('userId') userId: string): Promise<User> {
    const user = await this.usersService.findOneById(userId);
    if (!user) {
      throw new NotFoundException('user not found');
    }
    return user;
  }

  @UpdateUserByIdDecorator()
  @Patch('/:userId')
  async updateUser(
    @Param('userId') userId: string,
    @Body() body: Partial<User>,
  ) {
    return await this.usersService.updateUserByAdmin(userId, body);
  }

  // this is actually a PATCH request that sets user.active = false
  @DeleteUserByIdDecorator()
  @Delete('/:userId')
  async removeUser(@Param('userId') userId: string) {
    return this.usersService.deactivate(userId);
  }

  @HardDeleteUserByIdDecorator()
  @Delete('/:userId/delete')
  async deleteUser(@Param('userId') userId: string) {
    return this.usersService.remove(userId);
  }

  @AssignRoleDecorator()
  @Post(':userId/assign')
  async assignRole(
    @Param('userId') userId: string,
    @Body('role') role: UserRoles,
  ) {
    return await this.usersService.assignRole(userId, role);
  }
}
