import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

// Public, unauthenticated status page — intentionally excludes any
// owner/account data, only monitor name + recent uptime. Still subject to
// the global rate limiter since it's unauthenticated.
@Controller('status')
export class StatusController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':slug')
  async getStatus(@Param('slug') slug: string) {
    const project = await this.prisma.project.findUnique({
      where: { slug },
      select: {
        name: true,
        slug: true,
        monitors: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            checks: {
              orderBy: { checkedAt: 'desc' },
              take: 90,
              select: { isUp: true, checkedAt: true, responseTimeMs: true },
            },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Status page not found');
    }

    return project;
  }
}
