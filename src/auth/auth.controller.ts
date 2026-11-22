import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { CurrentUser } from './current-user.decorator.js';
import type { AuthUser } from '../auth/current-user.decorator.js';

const COOKIE_NAME = 'access_token';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  private cookieOptions() {
    const isProd = this.config.get('NODE_ENV') === 'production';
    return {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? ('none' as const) : ('lax' as const),
      path: '/',
    };
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, userId, email } = await this.authService.register(dto);
    res.cookie(COOKIE_NAME, token, this.cookieOptions());
    return { userId, email };
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, userId, email } = await this.authService.login(dto);
    res.cookie(COOKIE_NAME, token, this.cookieOptions());
    return { userId, email };
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(COOKIE_NAME, this.cookieOptions());
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}
