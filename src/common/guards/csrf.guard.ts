import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { CSRF_COOKIE_NAME } from '../middleware/csrf-cookie.middleware.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const HEADER_NAME = 'x-csrf-token';

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    if (SAFE_METHODS.has(req.method)) {
      return true;
    }

    const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
    const headerToken = req.headers[HEADER_NAME];

    if (
      typeof cookieToken !== 'string' ||
      typeof headerToken !== 'string' ||
      !safeEqual(cookieToken, headerToken)
    ) {
      throw new ForbiddenException('Invalid or missing CSRF token');
    }

    return true;
  }
}
