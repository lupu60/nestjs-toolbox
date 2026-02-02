import { WinstonLoggerService } from "../winston-logger.service";

describe("WinstonLoggerService", () => {
	let logger: WinstonLoggerService;
	beforeEach(() => {
		logger = new WinstonLoggerService({
			projectName: "ProjectName",
			timeFormatStr: "YYYY-MM-DD HH:mm:ss",
		});
	});

	it("should be defined", () => {
		expect(logger).toBeDefined();
	});

	it("should log", () => {
		logger.log("Hello From Winston", "Test");
	});

	it("should war", () => {
		logger.warn("Warning From Winston", "Test");
	});

	it("should err", () => {
		logger.error("Error From Winston", "trace");
	});
	it("should log object", () => {
		const key1Value = "key1Value";
		const testObject = {
			key1: key1Value,
			key2: "key2",
			key3: "key3",
		};
		logger.log(testObject);
	});

	it("should log object", () => {
		const key1Value = "key1Value";
		const testObject = {
			key1: key1Value,
			key2: "key2",
			key3: "key3",
		};
		logger.log(`${testObject}`);
	});

	it("should throw project name is required", () => {
		expect(() => {
			const loggerWithErr = new WinstonLoggerService({
				projectName: "",
			});
			expect(loggerWithErr).toBeUndefined();
		}).toThrow("projectName is required");
	});
});
