import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { getVersion } from '@nest-toolbox/version-generator';

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
    description: 'Demonstrates @nest-toolbox/version-generator package',
  })
  @ApiResponse({ status: 200, description: 'Version retrieved successfully' })
  version() {
    return {
      version: getVersion(),
      node: process.version,
      platform: process.platform,
    };
  }
}
