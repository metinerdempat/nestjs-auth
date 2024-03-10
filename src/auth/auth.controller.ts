import { Body, Controller, HttpStatus, Patch, Post, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags } from '@nestjs/swagger';
import { SignupUserDto } from './dtos/signup-user.dto';
import { Response } from 'express';
import { GoogleLoginDto } from './dtos/google-login.dto';
import {
  ChangePasswordDecorator,
  ForgotPasswordDecorator,
  GoogleLoginDecorator,
  LoginUsersDecorator,
  RefreshTokenDecorator,
  RegisterUsersDecorator,
  ResetPasswordDecorator,
} from './decorators';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
//import { User } from 'src/users/entities/user.entity';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { PasswordService } from './password.service';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { AuthenticatedResponseDto } from './dtos/auth-response.dto';
import { TokenService } from './token.service';
import { UsersService } from 'src/users/users.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private passwordService: PasswordService,
    private tokenService: TokenService,
    private usersService: UsersService,
  ) {}

  @RegisterUsersDecorator()
  @Post('register')
  async registerUser(@Body() body: SignupUserDto) {
    return await this.authService.register(body.email, body.password);
  }

  @LoginUsersDecorator()
  @Post('login')
  async signin(@CurrentUser() user: any) {
    return await this.authService.login(user);
  }

  @GoogleLoginDecorator()
  @Post('google-login')
  async googleLogin(@Body() body: GoogleLoginDto) {
    return await this.authService.googleLogin(body.credential);
  }

  @ChangePasswordDecorator()
  @Patch('change-password')
  async changeMyPassword(
    @CurrentUser() user: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    this.passwordService.changePassword(user.id, changePasswordDto);

    const updatedUser = await this.usersService.findOneById(user.id);
    return await this.authService.login(updatedUser);
  }

  @ForgotPasswordDecorator()
  @Post('forgot-password')
  async forgotPassword(
    @Body() body: ForgotPasswordDto,
    @Res() response: Response,
  ): Promise<Response> {
    await this.passwordService.forgotPassword(body.email);
    return response.status(HttpStatus.OK).json({
      message: 'Şifre sıfırlama E-postası gönderilmiştir.',
    });
  }

  @ResetPasswordDecorator()
  @Post('reset-password')
  async resetPassword(
    @Body() body: ResetPasswordDto,
  ): Promise<AuthenticatedResponseDto> {
    return await this.passwordService.resetPassword(
      body.resetToken,
      body.newPassword,
    );
  }

  // @UseGuards(AuthGuard('refresh'))
  @RefreshTokenDecorator()
  @Post('refresh')
  async refresh(
    @Body('refreshToken') body: string,
  ): Promise<AuthenticatedResponseDto> {
    return await this.tokenService.refreshToken(body);
  }
}
