import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module.js';
import { MonitorsController } from './monitors.controller.js';
import { MonitorsService } from './monitors.service.js';

@Module({
  imports: [ProjectsModule],
  controllers: [MonitorsController],
  providers: [MonitorsService],
  exports: [MonitorsService],
})
export class MonitorsModule {}
