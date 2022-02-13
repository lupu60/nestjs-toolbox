import { Logger } from '@nestjs/common';
import chalk from 'chalk';

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
  logger.log(chalk.green.bold(`🎉 Bootstrapping ${package_json_body.name}:${package_json_body.version}`));
  logger.log(chalk.red.bold(`🚀 Server is using ${environment} environment`));
  logger.log(chalk.blue.bold(`✅ Server running on 👉 ${hostname}/api`));
  if (database_url) {
    logger.log(chalk.blue.bold(`💾 Database ${JSON.stringify({ url: database_url })}`));
  }
  if (swagger) {
    logger.log(chalk.green.bold(`📄 Swagger 👉 ${hostname}/swagger/`));
  }
  if (health_check) {
    logger.log(chalk.green.bold(`🩺 Check Health 👉 ${hostname}/health`));
  }
  if (redis_url) {
    logger.log(chalk.magenta.bold(`📮 Connected to ${redis_url}`));
  }
  if (sentry) {
    logger.log(chalk.blue.bold(`📶 Setting up Sentry for ${environment} environment`));
  }
}
