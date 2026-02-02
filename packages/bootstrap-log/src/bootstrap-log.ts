import { Logger } from '@nestjs/common';
import colors from 'colors';

export interface AppConfig {
  environment: string;
  hostname: string;
  package_json_body: {
    name: string;
    version: string;
  };
  redis_url?: string;
  database_url?: string;
  sentry?: boolean;
  health_check?: boolean;
  swagger?: boolean;
}

export function BootstrapLog(options: { config: AppConfig }) {
  const { config } = options;
  const { redis_url, database_url, environment, hostname, package_json_body, health_check, swagger, sentry } = config;
  const logger: Logger = new Logger('Bootstrap');
  logger.log(process.stdout.isTTY ? colors.green.bold : (x => x)(`🎉 Bootstrapping ${package_json_body.name}:${package_json_body.version}`));
  logger.log(colors.red.bold(`🚀 Server is using ${environment} environment`));
  logger.log(colors.blue.bold(`✅ Server running on 👉 ${hostname}`));
  if (database_url) {
    logger.log(colors.blue.bold(`💾 Database ${database_url}`));
  }
  if (swagger) {
    logger.log(process.stdout.isTTY ? colors.green.bold : (x => x)(`📄 Swagger 👉 ${hostname}/swagger/`));
  }
  if (health_check) {
    logger.log(process.stdout.isTTY ? colors.green.bold : (x => x)(`🩺 Check Health 👉 ${hostname}/health`));
  }
  if (redis_url) {
    logger.log(colors.magenta.bold(`📮 Connected to ${redis_url}`));
  }
  if (sentry) {
    logger.log(colors.blue.bold(`📶 Setting up Sentry for ${environment} environment`));
  }
}
