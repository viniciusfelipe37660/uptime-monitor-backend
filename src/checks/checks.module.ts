import { Module } from '@nestjs/common';
import { MonitorsModule } from '../monitors/monitors.module.js';
import { ChecksService } from './checks.service.js';
import { ChecksController } from './checks.controller.js';

@Module({
  imports: [MonitorsModule],
  controllers: [ChecksController],
  providers: [ChecksService],
})
export class ChecksModule {}
