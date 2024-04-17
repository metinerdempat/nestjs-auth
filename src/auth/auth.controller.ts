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
  LoginWithTwoFactorDecorator,
  RefreshTokenDecorator,
  RegisterUsersDecorator,
  ResendTwoFactorAuthDecorator,
  ResendTwoFactorAuthForLoginDecorator,
  ResetPasswordDecorator,
  SetupTwoFactorAuthDecorator,
  VerifyTwoFactorAuthDecorator,
} from './decorators';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { PasswordService } from './password.service';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { AuthenticatedResponseDto } from './dtos/auth-response.dto';
import { TokenService } from './token.service';
import { UsersService } from 'src/users/users.service';
import { TwoFactorAuthenticationService } from './two-factor.service';
import { ValidateOtpDto } from './dtos/validate-otp.dto';
import { Resend2faOtpDto } from './dtos/resend-2fa-otp.dto';
import { LoginWithTwoFactorAuthenticationDto } from './dtos/login-with-2fa.dto';
import { User } from '../users/entities/user.entity';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private passwordService: PasswordService,
    private tokenService: TokenService,
    private usersService: UsersService,
    private twoFactorAuthenticationService: TwoFactorAuthenticationService,
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

  @LoginWithTwoFactorDecorator()
  @Post('login-with-two-factor-authentication')
  async loginWith2FA(
    @Body() body: LoginWithTwoFactorAuthenticationDto,
    @CurrentUser() user: any,
  ) {
    return await this.authService.loginWithOtp(body, user);
  }

  @ResendTwoFactorAuthForLoginDecorator()
  @Post('resend-two-factor-authentication-for-login')
  async resend2faForLogin(@Body() body: Resend2faOtpDto) {
    return await this.twoFactorAuthenticationService.resend2faForLogin(body);
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

  @SetupTwoFactorAuthDecorator()
  @Post('setup-two-factor-authentication')
  async setup2fa(@CurrentUser() user: any): Promise<{ message: string }> {
    return await this.twoFactorAuthenticationService.setup2FA(user);
  }

  @VerifyTwoFactorAuthDecorator()
  @Post('verify-two-factor-authentication')
  async verify2FA(
    @CurrentUser() user: any,
    @Body() body: ValidateOtpDto,
  ): Promise<{ message: string }> {
    return await this.twoFactorAuthenticationService.verify2FA(user, body);
  }

  @ResendTwoFactorAuthDecorator()
  @Post('resend-two-factor-authentication')
  async resend2faOtp(@CurrentUser() user: any): Promise<{ message: string }> {
    return this.twoFactorAuthenticationService.resend2faOtp(user.id);
  }
}
