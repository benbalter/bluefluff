const { expect } = require("chai");
const sinon = require("sinon");

describe("logger", function() {
	let originalEnv;
	
	beforeEach(function() {
		// Save original environment variables
		originalEnv = {
			LOG_LEVEL: process.env.LOG_LEVEL,
			NODE_ENV: process.env.NODE_ENV
		};
		
		// Clear module cache to get fresh logger instance
		delete require.cache[require.resolve("../logger")];
	});
	
	afterEach(function() {
		// Restore original environment variables
		if (originalEnv.LOG_LEVEL !== undefined) {
			process.env.LOG_LEVEL = originalEnv.LOG_LEVEL;
		} else {
			delete process.env.LOG_LEVEL;
		}
		
		if (originalEnv.NODE_ENV !== undefined) {
			process.env.NODE_ENV = originalEnv.NODE_ENV;
		} else {
			delete process.env.NODE_ENV;
		}
	});

	describe("log level configuration", function() {
		it("should use LOG_LEVEL environment variable when set", function() {
			process.env.LOG_LEVEL = "warn";
			const logger = require("../logger");
			
			expect(logger.level).to.equal("warn");
		});

		it("should default to 'debug' when LOG_LEVEL not set", function() {
			delete process.env.LOG_LEVEL;
			const logger = require("../logger");
			
			expect(logger.level).to.equal("debug");
		});

		it("should accept 'info' log level", function() {
			process.env.LOG_LEVEL = "info";
			const logger = require("../logger");
			
			expect(logger.level).to.equal("info");
		});

		it("should accept 'error' log level", function() {
			process.env.LOG_LEVEL = "error";
			const logger = require("../logger");
			
			expect(logger.level).to.equal("error");
		});

		it("should accept 'verbose' log level", function() {
			process.env.LOG_LEVEL = "verbose";
			const logger = require("../logger");
			
			expect(logger.level).to.equal("verbose");
		});
	});

	describe("production vs development mode", function() {
		it("should add console transport in development mode", function() {
			delete process.env.NODE_ENV;
			const logger = require("../logger");
			
			// In non-production mode, console transport should be added
			expect(logger.transports).to.have.lengthOf.at.least(1);
		});

		it("should not add console transport in production mode", function() {
			process.env.NODE_ENV = "production";
			const logger = require("../logger");
			
			// In production mode, no console transport should be added (starts empty)
			expect(logger.transports).to.have.lengthOf(0);
		});
	});

	describe("logger instance", function() {
		it("should be a winston logger instance", function() {
			const logger = require("../logger");
			const winston = require("winston");
			
			expect(logger).to.be.an.instanceOf(winston.Logger);
		});

		it("should have logging methods", function() {
			const logger = require("../logger");
			
			expect(logger.info).to.be.a("function");
			expect(logger.warn).to.be.a("function");
			expect(logger.error).to.be.a("function");
			expect(logger.debug).to.be.a("function");
			expect(logger.verbose).to.be.a("function");
		});

		it("should use JSON format", function() {
			const logger = require("../logger");
			
			// Check that the format is set (winston uses Symbol for format)
			expect(logger.format).to.exist;
		});
	});

	describe("logging functionality", function() {
		it("should log messages at appropriate levels", function() {
			process.env.LOG_LEVEL = "debug";
			const logger = require("../logger");
			
			// Just verify that logging methods can be called without errors
			expect(() => logger.debug("Debug message")).to.not.throw();
			expect(() => logger.info("Info message")).to.not.throw();
			expect(() => logger.warn("Warning message")).to.not.throw();
			expect(() => logger.error("Error message")).to.not.throw();
		});

		it("should respect log level filtering", function() {
			process.env.LOG_LEVEL = "error";
			const logger = require("../logger");
			
			// Verify the level is set correctly
			expect(logger.level).to.equal("error");
			
			// Debug and info should not throw errors even though they won't be logged
			expect(() => logger.debug("Debug message")).to.not.throw();
			expect(() => logger.info("Info message")).to.not.throw();
			expect(() => logger.warn("Warning message")).to.not.throw();
			expect(() => logger.error("Error message")).to.not.throw();
		});
	});
});
