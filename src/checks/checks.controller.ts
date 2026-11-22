import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/current-user.decorator.js';
import { MonitorsService } from '../monitors/monitors.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

@UseGuards(JwtAuthGuard)
@Controller('monitors/:id')
export class ChecksController {
  constructor(
    private readonly monitorsService: MonitorsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('checks')
  async checks(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.monitorsService.findOneForUser(user.userId, id);
    return this.prisma.check.findMany({
      where: { monitorId: id },
      orderBy: { checkedAt: 'desc' },
      take: 200,
    });
  }

  @Get('incidents')
  async incidents(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.monitorsService.findOneForUser(user.userId, id);
    return this.prisma.incident.findMany({
      where: { monitorId: id },
      orderBy: { startedAt: 'desc' },
      take: 100,
    });
  }
}
