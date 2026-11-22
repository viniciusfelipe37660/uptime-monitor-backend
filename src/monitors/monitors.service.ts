import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProjectsService } from '../projects/projects.service.js';
import { CreateMonitorDto } from './dto/create-monitor.dto.js';
import { checkUrlIsSafe } from '../common/utils/url-safety.js';

@Injectable()
export class MonitorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectsService: ProjectsService,
  ) {}

  async create(userId: string, projectId: string, dto: CreateMonitorDto) {
    await this.projectsService.findOneForUser(userId, projectId);

    const safety = await checkUrlIsSafe(dto.url);
    if (!safety.safe) {
      throw new BadRequestException(`URL rejected: ${safety.reason}`);
    }

    return this.prisma.monitor.create({
      data: {
        name: dto.name,
        url: dto.url,
        intervalSeconds: dto.intervalSeconds,
        projectId,
      },
    });
  }

  async findAllForProject(userId: string, projectId: string) {
    await this.projectsService.findOneForUser(userId, projectId);
    return this.prisma.monitor.findMany({ where: { projectId } });
  }

  async findOneForUser(userId: string, id: string) {
    const monitor = await this.prisma.monitor.findFirst({
      where: { id, project: { userId } },
      include: { project: true },
    });
    if (!monitor) {
      throw new NotFoundException('Monitor not found');
    }
    return monitor;
  }

  async remove(userId: string, id: string) {
    await this.findOneForUser(userId, id);
    return this.prisma.monitor.delete({ where: { id } });
  }
}
