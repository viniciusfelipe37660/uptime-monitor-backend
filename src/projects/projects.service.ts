import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProjectDto } from './dto/create-project.dto.js';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateProjectDto) {
    const existing = await this.prisma.project.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException('Slug already in use');
    }

    return this.prisma.project.create({
      data: { name: dto.name, slug: dto.slug, userId },
    });
  }

  findAllForUser(userId: string) {
    return this.prisma.project.findMany({ where: { userId } });
  }

  async findOneForUser(userId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, userId },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  async remove(userId: string, id: string) {
    await this.findOneForUser(userId, id);
    return this.prisma.project.delete({ where: { id } });
  }
}
