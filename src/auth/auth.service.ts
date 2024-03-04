import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { GoogleProfile, UsersService } from '../users/users.service';
import { randomBytes, scrypt as _scrypt } from 'crypto';
import { promisify } from 'util';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { ChangePasswordDto } from './dto/change-password.dto';
import { User, UserStatus } from 'src/users/entities/user.entity';
import { AccountInactiveException } from 'src/common/exceptions/account-inactive.exception';
import { TokenService } from './token.service';

//scrypt is async by nature and required to use as a callback. we dont want to use callback so we use primisify to make it a promise
const scrypt = promisify(_scrypt);
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private tokenService: TokenService,
  ) {}

  async signup(email: string, password: string) {
    //see if email is in use
    const user = await this.usersService.findByEmail(email);

    // If user already exists and is a Google user
    if (user && user.googleId) {
      throw new ForbiddenException(
        'This email is associated with a Google account. Please use Google to login.',
      );
    }

    if (user) throw new BadRequestException('email in use');
    //hash user password
    //-generate a salt
    //---generate 8 bytes of decimal number and turn it into a hexadecimal string
    const salt = randomBytes(8).toString('hex');
    //-hash the salt and generate together
    //--hash the password with the salt, 32 strong
    const hash = (await scrypt(password, salt, 32)) as Buffer;
    //---this is to help typescript to let it know what hash' type is. otherwise it says unknown

    //-join the hashed result and the salrt together.
    const result = salt + '.' + hash.toString('hex');

    //create new user and save it
    const createdUser = await this.usersService.create(email, result);
    //return the user;

    const payload = { sub: createdUser.id, email: createdUser.email };

    return {
      token: this.jwtService.sign(payload),
    };
  }

  async login(user: User) {
    if (
      user.status === UserStatus.Inactive ||
      user.status === UserStatus.Deleted ||
      user.status === UserStatus.Blocked
    ) {
      throw new AccountInactiveException(
        'Hesabınız aktif değil. Lütfen destekle iletişime geçin.',
      );
    }

    const accessToken = await this.tokenService.createAccessToken(user);
    const refreshToken = await this.tokenService.createRefreshToken(user);

    // return { token, refreshToken };
    const loginResponse: any = { accessToken, refreshToken };

    // Return the response object
    return loginResponse;
  }

  async signin(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) throw new NotFoundException('User not found');

    // Check if user has a password (not a Google user)
    if (!user.password && user.googleId) {
      throw new ForbiddenException('Please use Google to login');
    }

    const [salt, storedHash] = user.password.split('.');

    const hash = (await scrypt(password, salt, 32)) as Buffer;

    if (storedHash !== hash.toString('hex')) {
      throw new BadRequestException('Wrong email or password');
    }

    const payload = { sub: user.id, email: user.email };

    return {
      token: this.jwtService.sign(payload),
    };
  }

  async googleLogin(token: string) {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    // Get the user's Google ID
    const googleId = payload['sub'];

    // Get or create the user with this Google ID
    let user = await this.usersService.findByGoogleId(googleId);

    if (!user) {
      user = await this.usersService.createFromGoogle({
        email: payload['email'],
        googleId,
        picture: payload['picture'],
        displayName: payload['displayName'],
        firstName: payload['given_name'],
        provider: 'google',
        isActivatedWithEmail: payload['email_verified'],
      });
    }

    const jwtPayload = { sub: user.id, email: user.email };

    return {
      token: this.jwtService.sign(jwtPayload),
    };
  }

  async verifyUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (user && user.provider === 'google') {
      throw new UnprocessableEntityException(
        'Bu mail adresiyle daha önce farklı bir yöntemle kaydolmuşsunuz.',
      );
    }

    if (!user) {
      throw new NotFoundException('Bu e-posta adresli kullanıcı bulunamadı.');
    }

    const [salt, storedHash] = user.password.split('.');

    const hash = (await scrypt(password, salt, 32)) as Buffer;

    if (storedHash !== hash.toString('hex')) {
      throw new BadRequestException('Wrong email or password');
    }

    return user;
  }
}
