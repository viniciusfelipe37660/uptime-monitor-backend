import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

export const CSRF_COOKIE_NAME = 'csrf_token';

@Injectable()
export class CsrfCookieMiddleware implements NestMiddleware {
  constructor(private readonly config: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    if (!req.cookies?.[CSRF_COOKIE_NAME]) {
      const isProd = this.config.get('NODE_ENV') === 'production';
      res.cookie(CSRF_COOKIE_NAME, randomUUID(), {
        httpOnly: false,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        path: '/',
      });
    }
    next();
  }
}
