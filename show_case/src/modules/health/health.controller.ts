import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('version')
  @ApiOperation({
    summary: 'Get application version',
  })
  @ApiResponse({ status: 200, description: 'Version retrieved successfully' })
  version() {
    return {
      version: '1.0.0',
      name: 'NestJS Toolbox Showcase',
      node: process.version,
      platform: process.platform,
    };
  }
}
