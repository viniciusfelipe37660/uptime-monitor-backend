import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller.js';
import { StatusController } from './status.controller.js';
import { ProjectsService } from './projects.service.js';

@Module({
  controllers: [ProjectsController, StatusController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
