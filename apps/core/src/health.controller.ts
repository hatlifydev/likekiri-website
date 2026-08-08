import { Controller, Get } from '@nestjs/common';

interface HealthReport {
  status: 'ok';
  uptime: number;
}

@Controller('api/health')
export class HealthController {
  @Get()
  health(): HealthReport {
    return { status: 'ok', uptime: process.uptime() };
  }
}
