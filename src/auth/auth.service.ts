import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import * as AuthDTO from './auth.dto';

@Injectable()
export class AuthService {
  private logger = new Logger('Admin service');

  constructor(
    private readonly prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async signUp(data: AuthDTO.SignUp): Promise<User> {
    this.logger.log('signUp');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    const createAdmin = await this.prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
    });

    return createAdmin;
  }

  async signIn(data: AuthDTO.SignIn): Promise<{ accessToken: string }> {
    this.logger.log('signIn');

    const user = await this.prisma.user.findUnique({
      where: {
        phone: data.phone,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user && (await bcrypt.compare(data.password, user.password))) {
      const accessToken = this.jwtService.sign({ id: user.id });
      return { accessToken };
    } else {
      throw new UnauthorizedException('Please check your login credentials');
    }
  }
}
