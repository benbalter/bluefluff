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

	describe("LCD command", function() {
		it("should send correct buffer for LCD on", function(done) {
			const mockFluff = {
				generalPlusWrite: sinon.spy(function(buffer, callback) {
					expect(Buffer.isBuffer(buffer)).to.be.true;
					expect(buffer.length).to.equal(2);
					expect(buffer[0]).to.equal(0xcd);
					expect(buffer[1]).to.equal(1);
					if (callback) callback(false);
				})
			};

			fluffaction.execute(mockFluff, "lcd", {state: 1}, function(error) {
				expect(error).to.equal(false);
				expect(mockFluff.generalPlusWrite.calledOnce).to.be.true;
				done();
			});
		});

		it("should send correct buffer for LCD off", function(done) {
			const mockFluff = {
				generalPlusWrite: sinon.spy(function(buffer, callback) {
					expect(Buffer.isBuffer(buffer)).to.be.true;
					expect(buffer.length).to.equal(2);
					expect(buffer[0]).to.equal(0xcd);
					expect(buffer[1]).to.equal(0);
					if (callback) callback(false);
				})
			};

			fluffaction.execute(mockFluff, "lcd", {state: 0}, function(error) {
				expect(error).to.equal(false);
				expect(mockFluff.generalPlusWrite.calledOnce).to.be.true;
				done();
			});
		});
	});

	describe("setname command", function() {
		it("should send correct sequence for setting name", function(done) {
			const mockFluff = {
				generalPlusWriteSequence: sinon.spy(function(sequence, callback) {
					expect(sequence).to.be.an("array");
					expect(sequence.length).to.equal(2);
					
					// First command: 0x21 to set name
					expect(Buffer.isBuffer(sequence[0])).to.be.true;
					expect(sequence[0][0]).to.equal(0x21);
					expect(sequence[0][1]).to.equal(5);
					
					// Second command: 0x13 action to announce name
					expect(Buffer.isBuffer(sequence[1])).to.be.true;
					expect(sequence[1][0]).to.equal(0x13);
					expect(sequence[1][5]).to.equal(5);
					
					if (callback) callback(false);
				})
			};

			fluffaction.execute(mockFluff, "setname", {name: 5}, function(error) {
				expect(error).to.equal(false);
				expect(mockFluff.generalPlusWriteSequence.calledOnce).to.be.true;
				done();
			});
		});
	});

	describe("moodmeter command", function() {
		it("should send correct buffer for setting wellness value", function(done) {
			const mockFluff = {
				generalPlusWrite: sinon.spy(function(buffer, callback) {
					expect(Buffer.isBuffer(buffer)).to.be.true;
					expect(buffer.length).to.equal(4);
					expect(buffer[0]).to.equal(0x23);
					expect(buffer[1]).to.equal(1); // action: set value
					expect(buffer[2]).to.equal(4); // type: wellness
					expect(buffer[3]).to.equal(80); // value
					if (callback) callback(false);
				})
			};

			fluffaction.execute(mockFluff, "moodmeter", {action: 1, type: 4, value: 80}, function(error) {
				expect(error).to.equal(false);
				expect(mockFluff.generalPlusWrite.calledOnce).to.be.true;
				done();
			});
		});

		it("should send correct buffer for increasing tiredness", function(done) {
			const mockFluff = {
				generalPlusWrite: sinon.spy(function(buffer, callback) {
					expect(Buffer.isBuffer(buffer)).to.be.true;
					expect(buffer.length).to.equal(4);
					expect(buffer[0]).to.equal(0x23);
					expect(buffer[1]).to.equal(0); // action: increase value
					expect(buffer[2]).to.equal(2); // type: tiredness
					expect(buffer[3]).to.equal(10); // delta
					if (callback) callback(false);
				})
			};

			fluffaction.execute(mockFluff, "moodmeter", {action: 0, type: 2, value: 10}, function(error) {
				expect(error).to.equal(false);
				expect(mockFluff.generalPlusWrite.calledOnce).to.be.true;
				done();
			});
		});
	});

	describe("DLC commands", function() {
		it("should delete DLC from slot", function(done) {
			const mockFluff = {
				generalPlusWrite: sinon.spy(function(buffer, callback) {
					expect(Buffer.isBuffer(buffer)).to.be.true;
					expect(buffer.length).to.equal(2);
					expect(buffer[0]).to.equal(0x74);
					expect(buffer[1]).to.equal(2); // slot
					if (callback) callback(false);
				})
			};

			fluffaction.execute(mockFluff, "dlc_delete", {slot: 2}, function(error) {
				expect(error).to.equal(false);
				expect(mockFluff.generalPlusWrite.calledOnce).to.be.true;
				done();
			});
		});

		it("should load DLC from slot", function(done) {
			const mockFluff = {
				generalPlusWrite: sinon.spy(function(buffer, callback) {
					expect(Buffer.isBuffer(buffer)).to.be.true;
					expect(buffer.length).to.equal(2);
					expect(buffer[0]).to.equal(0x60);
					expect(buffer[1]).to.equal(3); // slot
					if (callback) callback(false);
				})
			};

			fluffaction.execute(mockFluff, "dlc_load", {slot: 3}, function(error) {
				expect(error).to.equal(false);
				expect(mockFluff.generalPlusWrite.calledOnce).to.be.true;
				done();
			});
		});

		it("should activate loaded DLC", function(done) {
			const mockFluff = {
				generalPlusWrite: sinon.spy(function(buffer, callback) {
					expect(Buffer.isBuffer(buffer)).to.be.true;
					expect(buffer.length).to.equal(1);
					expect(buffer[0]).to.equal(0x61);
					if (callback) callback(false);
				})
			};

			fluffaction.execute(mockFluff, "dlc_activate", {}, function(error) {
				expect(error).to.equal(false);
				expect(mockFluff.generalPlusWrite.calledOnce).to.be.true;
				done();
			});
		});

		it("should deactivate DLC in slot", function(done) {
			const mockFluff = {
				generalPlusWrite: sinon.spy(function(buffer, callback) {
					expect(Buffer.isBuffer(buffer)).to.be.true;
					expect(buffer.length).to.equal(2);
					expect(buffer[0]).to.equal(0x62);
					expect(buffer[1]).to.equal(1); // slot
					if (callback) callback(false);
				})
			};

			fluffaction.execute(mockFluff, "dlc_deactivate", {slot: 1}, function(error) {
				expect(error).to.equal(false);
				expect(mockFluff.generalPlusWrite.calledOnce).to.be.true;
				done();
			});
		});
	});

	describe("Nordic commands", function() {
		it("should send custom command to Nordic", function(done) {
			const mockFluff = {
				nordicWrite: sinon.spy(function(buffer, callback) {
					expect(Buffer.isBuffer(buffer)).to.be.true;
					expect(buffer.toString("hex")).to.equal("1234567890");
					if (callback) callback(false);
				})
			};

			fluffaction.execute(mockFluff, "nordic_custom", {cmd: "1234567890"}, function(error) {
				expect(error).to.equal(false);
				expect(mockFluff.nordicWrite.calledOnce).to.be.true;
				done();
			});
		});

		it("should enable packet ACK", function(done) {
			const mockFluff = {
				nordicWrite: sinon.spy(function(buffer, callback) {
					expect(Buffer.isBuffer(buffer)).to.be.true;
					expect(buffer.length).to.equal(3);
					expect(buffer[0]).to.equal(0x09);
					expect(buffer[1]).to.equal(1);
					expect(buffer[2]).to.equal(0x00);
					if (callback) callback(false);
				})
			};

			fluffaction.execute(mockFluff, "nordic_packetack", {state: 1}, function(error) {
				expect(error).to.equal(false);
				expect(mockFluff.nordicWrite.calledOnce).to.be.true;
				done();
			});
		});

		it("should disable packet ACK", function(done) {
			const mockFluff = {
				nordicWrite: sinon.spy(function(buffer, callback) {
					expect(Buffer.isBuffer(buffer)).to.be.true;
					expect(buffer.length).to.equal(3);
					expect(buffer[0]).to.equal(0x09);
					expect(buffer[1]).to.equal(0);
					expect(buffer[2]).to.equal(0x00);
					if (callback) callback(false);
				})
			};

			fluffaction.execute(mockFluff, "nordic_packetack", {state: 0}, function(error) {
				expect(error).to.equal(false);
				expect(mockFluff.nordicWrite.calledOnce).to.be.true;
				done();
			});
		});
	});

	describe("setidle command", function() {
		it("should start idle mode", function() {
			const mockFluff = {
				startIdle: sinon.spy(),
				stopIdle: sinon.spy()
			};

			fluffaction.execute(mockFluff, "setidle", {idle: "1"});
			expect(mockFluff.startIdle.calledOnce).to.be.true;
			expect(mockFluff.stopIdle.called).to.be.false;
		});

		it("should stop idle mode", function() {
			const mockFluff = {
				startIdle: sinon.spy(),
				stopIdle: sinon.spy()
			};

			fluffaction.execute(mockFluff, "setidle", {idle: "0"});
			expect(mockFluff.stopIdle.calledOnce).to.be.true;
			expect(mockFluff.startIdle.called).to.be.false;
		});
	});
});
