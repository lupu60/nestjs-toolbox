import { type AppConfig, BootstrapLog } from "..";

describe("BootstrapLog", () => {
	it("should log", () => {
		const config: AppConfig = {
			environment: "development",
			hostname: "localhost",
			package_json_body: {
				name: "test",
				version: "1.0.0",
			},
		};
		BootstrapLog({ config });
	});

	it("should log all", () => {
		const config: AppConfig = {
			environment: "development",
			hostname: "localhost",
			package_json_body: {
				name: "test",
				version: "1.0.0",
			},
			redis_url: "redis://localhost:6379",
			database_url: "postgres://localhost:5432/test",
			sentry: true,
			health_check: true,
			swagger: true,
		};
		BootstrapLog({ config });
	});
});
