const { expect } = require("chai");
const sinon = require("sinon");

describe("fluffaction", function() {
	let fluffaction;
	
	beforeEach(function() {
		// Reset module cache to get fresh instance
		delete require.cache[require.resolve("../fluffaction")];
		fluffaction = require("../fluffaction");
	});

	describe("Buffer.from() usage", function() {
		it("should use Buffer.from() for antenna command", function(done) {
			const mockFluff = {
				generalPlusWrite: sinon.spy(function(buffer, callback) {
					expect(Buffer.isBuffer(buffer)).to.be.true;
					expect(buffer.length).to.equal(4);
					expect(buffer[0]).to.equal(0x14);
					expect(buffer[1]).to.equal(255);
					expect(buffer[2]).to.equal(128);
					expect(buffer[3]).to.equal(64);
					if (callback) callback(false);
				})
			};

			fluffaction.execute(mockFluff, "antenna", {red: 255, green: 128, blue: 64}, function(error) {
				expect(error).to.equal(false);
				expect(mockFluff.generalPlusWrite.calledOnce).to.be.true;
				done();
			});
		});

		it("should use Buffer.from() for debug command", function(done) {
			const mockFluff = {
				generalPlusWrite: sinon.spy(function(buffer, callback) {
					expect(Buffer.isBuffer(buffer)).to.be.true;
					expect(buffer.length).to.equal(1);
					expect(buffer[0]).to.equal(0xdb);
					if (callback) callback(false);
				})
			};

			fluffaction.execute(mockFluff, "debug", {}, function(error) {
				expect(error).to.equal(false);
				expect(mockFluff.generalPlusWrite.calledOnce).to.be.true;
				done();
			});
		});

		it("should use Buffer.from() for action command", function(done) {
			const mockFluff = {
				generalPlusWrite: sinon.spy(function(buffer, callback) {
					expect(Buffer.isBuffer(buffer)).to.be.true;
					expect(buffer.length).to.equal(6);
					expect(buffer[0]).to.equal(0x13);
					if (callback) callback(false);
				})
			};

			fluffaction.execute(mockFluff, "action", {input: 55, index: 2, subindex: 14, specific: 0}, function(error) {
				expect(error).to.equal(false);
				expect(mockFluff.generalPlusWrite.calledOnce).to.be.true;
				done();
			});
		});

		it("should use Buffer.from() for custom command with hex string", function(done) {
			const mockFluff = {
				generalPlusWrite: sinon.spy(function(buffer, callback) {
					expect(Buffer.isBuffer(buffer)).to.be.true;
					expect(buffer.toString("hex")).to.equal("deadbeef");
					if (callback) callback(false);
				})
			};

			fluffaction.execute(mockFluff, "custom", {cmd: "deadbeef"}, function(error) {
				expect(error).to.equal(false);
				expect(mockFluff.generalPlusWrite.calledOnce).to.be.true;
				done();
			});
		});
	});

	describe("DLC flashing optimization", function() {
		it("should use 20ms interval for writeToSlot calls", function(done) {
			this.timeout(5000);
			const fs = require("fs");
			const path = require("path");
			
			// Create a small test DLC file
			const testFile = path.join(__dirname, "test.dlc");
			fs.writeFileSync(testFile, Buffer.alloc(100));

			const writeCallTimestamps = [];
			const mockFluff = {
				generalPlusWrite: sinon.spy(function(buffer, callback) {
					if (callback) callback(false);
				}),
				addGeneralPlusCallback: function(callback) {
					// Simulate ready to receive response
					setTimeout(() => callback(Buffer.from([0x24, 0x02])), 10);
				},
				writeToSlot: sinon.spy(function(buffer) {
					writeCallTimestamps.push(Date.now());
				})
			};

			fluffaction.execute(mockFluff, "flashdlc", {
				filename: "test.dlc",
				dlcfile: testFile
			}, function(error) {
				// Wait for some writes to complete
				setTimeout(() => {
					// Verify interval is around 20ms (with some tolerance)
					if (writeCallTimestamps.length >= 3) {
						const interval1 = writeCallTimestamps[1] - writeCallTimestamps[0];
						const interval2 = writeCallTimestamps[2] - writeCallTimestamps[1];
						
						// Allow 15-25ms range (accounting for timing variations)
						expect(interval1).to.be.within(15, 30);
						expect(interval2).to.be.within(15, 30);
					}
					
					// Cleanup
					fs.unlinkSync(testFile);
					done();
				}, 150);
			});
		});
	});

	describe("command listing", function() {
		it("should list all available commands", function() {
			const list = fluffaction.list();
			expect(list).to.be.an("object");
			expect(list).to.have.property("antenna");
			expect(list).to.have.property("debug");
			expect(list).to.have.property("action");
			expect(list).to.have.property("flashdlc");
		});
	});
});
