import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';

// Pre-computed hash of a random value, used to keep login timing
// consistent whether or not the email exists (mitigates user enumeration).
const DUMMY_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHRzb21lc2FsdA$ZmFrZWZha2VmYWtlZmFrZWZha2VmYWtlZmFrZWZha2U';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    const user = await this.prisma.user.create({
      data: { email: dto.email, passwordHash },
    });

    return this.issueToken(user.id, user.email);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    const hashToVerify = user?.passwordHash ?? DUMMY_HASH;
    const valid = await argon2.verify(hashToVerify, dto.password).catch(() => false);

    if (!user || !valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueToken(user.id, user.email);
  }

  private issueToken(sub: string, email: string) {
    const token = this.jwt.sign({ sub, email });
    return { token, userId: sub, email };
  }
}
