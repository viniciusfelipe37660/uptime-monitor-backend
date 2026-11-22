import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { z } from 'zod';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { MonitorsModule } from './monitors/monitors.module.js';
import { ChecksModule } from './checks/checks.module.js';
import { AppController } from './app.controller.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: z.object({
        NODE_ENV: z
          .enum(['development', 'production', 'test'])
          .default('development'),
        PORT: z.coerce.number().default(3000),
        DATABASE_URL: z.url(),
        JWT_SECRET: z.string().min(32),
        JWT_EXPIRES_IN: z.string().default('15m'),
        CORS_ORIGIN: z.string().min(1),
      }),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    ProjectsModule,
    MonitorsModule,
    ChecksModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
