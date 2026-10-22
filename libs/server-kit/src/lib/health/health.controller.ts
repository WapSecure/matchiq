import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { HealthStatus } from '@matchiq/contracts';
import type { Response } from 'express';
import { HEALTH_ROUTE } from '../constants';
import { PublicRoute } from '../http/public-route';
import { HealthService } from './health.service';

@PublicRoute()
@Controller(HEALTH_ROUTE)
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get('live')
  live(): HealthStatus {
    return this.health.liveness();
  }

  @Get('ready')
  async ready(
    @Res({ passthrough: true }) res: Response,
  ): Promise<HealthStatus> {
    const report = await this.health.readiness();
    if (report.status === 'unavailable')
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    return report;
  }
}
