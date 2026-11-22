import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';
import { checkUrlIsSafe } from '../common/utils/url-safety.js';

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 2;

interface CheckResult {
  isUp: boolean;
  statusCode?: number;
  responseTimeMs?: number;
  error?: string;
}

@Injectable()
export class ChecksService {
  private readonly logger = new Logger(ChecksService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async runDueChecks() {
    const monitors = await this.prisma.monitor.findMany({
      where: { isActive: true },
    });

    const now = Date.now();
    const due = monitors.filter((m) => {
      if (!m.lastCheckedAt) return true;
      return now - m.lastCheckedAt.getTime() >= m.intervalSeconds * 1000;
    });

    await Promise.allSettled(due.map((monitor) => this.checkMonitor(monitor)));
  }

  private async checkMonitor(monitor: { id: string; url: string }) {
    const result = await this.performCheck(monitor.url);

    await this.prisma.$transaction([
      this.prisma.monitor.update({
        where: { id: monitor.id },
        data: { lastCheckedAt: new Date() },
      }),
      this.prisma.check.create({
        data: {
          monitorId: monitor.id,
          isUp: result.isUp,
          statusCode: result.statusCode,
          responseTimeMs: result.responseTimeMs,
          error: result.error,
        },
      }),
    ]);

    await this.reconcileIncident(monitor.id, result.isUp, result.error);
  }

  private async performCheck(
    url: string,
    hop = 0,
  ): Promise<CheckResult> {
    const safety = await checkUrlIsSafe(url);
    if (!safety.safe) {
      return { isUp: false, error: `Blocked: ${safety.reason}` };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const start = Date.now();

    try {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'user-agent': 'uptime-monitor/1.0' },
      });
      const responseTimeMs = Date.now() - start;

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (location && hop < MAX_REDIRECTS) {
          const nextUrl = new URL(location, url).toString();
          return this.performCheck(nextUrl, hop + 1);
        }
      }

      return {
        isUp: response.status >= 200 && response.status < 400,
        statusCode: response.status,
        responseTimeMs,
      };
    } catch (err) {
      return {
        isUp: false,
        responseTimeMs: Date.now() - start,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async reconcileIncident(
    monitorId: string,
    isUp: boolean,
    cause?: string,
  ) {
    const openIncident = await this.prisma.incident.findFirst({
      where: { monitorId, resolvedAt: null },
    });

    if (!isUp && !openIncident) {
      await this.prisma.incident.create({
        data: { monitorId, cause },
      });
      this.logger.warn(`Monitor ${monitorId} is DOWN: ${cause}`);
    }

    if (isUp && openIncident) {
      await this.prisma.incident.update({
        where: { id: openIncident.id },
        data: { resolvedAt: new Date() },
      });
      this.logger.log(`Monitor ${monitorId} recovered`);
    }
  }
}
