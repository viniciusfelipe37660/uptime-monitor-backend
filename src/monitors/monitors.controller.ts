import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/current-user.decorator.js';
import { MonitorsService } from './monitors.service.js';
import { CreateMonitorDto } from './dto/create-monitor.dto.js';

@UseGuards(JwtAuthGuard)
@Controller()
export class MonitorsController {
  constructor(private readonly monitorsService: MonitorsService) {}

  @Post('projects/:projectId/monitors')
  create(
    @CurrentUser() user: AuthUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateMonitorDto,
  ) {
    return this.monitorsService.create(user.userId, projectId, dto);
  }

  @Get('projects/:projectId/monitors')
  findAll(
    @CurrentUser() user: AuthUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.monitorsService.findAllForProject(user.userId, projectId);
  }

  @Get('monitors/:id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.monitorsService.findOneForUser(user.userId, id);
  }

  @Delete('monitors/:id')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.monitorsService.remove(user.userId, id);
  }
}
