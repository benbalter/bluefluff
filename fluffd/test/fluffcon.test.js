const { expect } = require("chai");
const sinon = require("sinon");

describe("fluffcon Fluff class", function() {
	describe("Buffer.from() usage in startIdle", function() {
		it("should use Buffer.from() for idle interval", function(done) {
			this.timeout(5000);  // Increase timeout
			
			// Mock the characteristics
			const mockGpWrite = {
				write: sinon.spy(function(buffer, withResponse, callback) {
					expect(Buffer.isBuffer(buffer)).to.be.true;
					expect(buffer.length).to.equal(1);
					expect(buffer[0]).to.equal(0x00);
					if (callback) callback(null);
				})
			};

			const mockGpListen = {
				on: sinon.stub(),
				subscribe: sinon.stub().callsArg(0)
			};

			const mockNWrite = { write: sinon.stub() };
			const mockNListen = {
				on: sinon.stub(),
				subscribe: sinon.stub().callsArg(0)
			};
			const mockRssiListen = {
				on: sinon.stub(),
				subscribe: sinon.stub().callsArg(0)
			};
			const mockFileWrite = { write: sinon.stub() };

			// Load fluffcon module
			delete require.cache[require.resolve("../fluffcon")];
			const fluffcon = require("../fluffcon");

			// Create mock peripheral
			const mockPeripheral = {
				uuid: "test-uuid",
				connect: function(callback) {
					callback(null);
				},
				discoverServices: function(uuids, callback) {
					callback(null, [{
						discoverCharacteristics: function(charUuids, callback) {
							const chars = {
								"dab91383b5a1e29cb041bcd562613bde": mockGpWrite,
								"dab91382b5a1e29cb041bcd562613bde": mockGpListen,
								"dab90757b5a1e29cb041bcd562613bde": mockNWrite,
								"dab90756b5a1e29cb041bcd562613bde": mockNListen,
								"dab90755b5a1e29cb041bcd562613bde": mockRssiListen,
								"dab90758b5a1e29cb041bcd562613bde": mockFileWrite
							};
							const result = charUuids.map(uuid => {
								const char = Object.assign({}, chars[uuid]);
								char.uuid = uuid;
								return char;
							});
							callback(null, result);
						}
					}]);
				},
				disconnect: sinon.stub().callsArg(0)
			};

			// Connect and verify idle interval uses Buffer.from()
			fluffcon.connect(mockPeripheral, function(fluff) {
				// Wait for idle interval to fire
				setTimeout(() => {
					try {
						expect(mockGpWrite.write.called).to.be.true;
						const firstCall = mockGpWrite.write.getCall(0);
						expect(Buffer.isBuffer(firstCall.args[0])).to.be.true;
						
						// Stop idle to cleanup
						fluff.stopIdle();
						done();
					} catch (e) {
						done(e);
					}
				}, 3200); // Just after first 3s interval
			});
		});
	});

	describe("generalPlusWriteSequence", function() {
		it("should execute sequence of commands in order", function(done) {
			const mockGpWrite = {
				write: sinon.stub().callsArgWith(2, null)
			};

			const mockGpListen = {
				on: sinon.stub(),
				subscribe: sinon.stub().callsArg(0)
			};

			const mockNWrite = { write: sinon.stub() };
			const mockNListen = {
				on: sinon.stub(),
				subscribe: sinon.stub().callsArg(0)
			};
			const mockRssiListen = {
				on: sinon.stub(),
				subscribe: sinon.stub().callsArg(0)
			};
			const mockFileWrite = { write: sinon.stub() };

			delete require.cache[require.resolve("../fluffcon")];
			const fluffcon = require("../fluffcon");

			const mockPeripheral = {
				uuid: "test-uuid",
				connect: function(callback) {
					callback(null);
				},
				discoverServices: function(uuids, callback) {
					callback(null, [{
						discoverCharacteristics: function(charUuids, callback) {
							const chars = {
								"dab91383b5a1e29cb041bcd562613bde": mockGpWrite,
								"dab91382b5a1e29cb041bcd562613bde": mockGpListen,
								"dab90757b5a1e29cb041bcd562613bde": mockNWrite,
								"dab90756b5a1e29cb041bcd562613bde": mockNListen,
								"dab90755b5a1e29cb041bcd562613bde": mockRssiListen,
								"dab90758b5a1e29cb041bcd562613bde": mockFileWrite
							};
							const result = charUuids.map(uuid => {
								const char = Object.assign({}, chars[uuid]);
								char.uuid = uuid;
								return char;
							});
							callback(null, result);
						}
					}]);
				},
				disconnect: sinon.stub().callsArg(0)
			};

			fluffcon.connect(mockPeripheral, function(fluff) {
				fluff.stopIdle();
				mockGpWrite.write.resetHistory();
				
				const seq = [Buffer.from([0x21, 5]), Buffer.from([0x13, 0x00, 0x21, 0x00, 0x00, 5])];
				fluff.generalPlusWriteSequence(seq, function(error) {
					expect(error).to.equal(false);
					expect(mockGpWrite.write.calledTwice).to.be.true;
					expect(mockGpWrite.write.firstCall.args[0].toString("hex")).to.equal("2105");
					expect(mockGpWrite.write.secondCall.args[0].toString("hex")).to.equal("130021000005");
					done();
				});
			});
		});
	});

	describe("nordicWrite", function() {
		it("should write to Nordic characteristic", function(done) {
			const mockGpWrite = {
				write: sinon.stub()
			};

			const mockGpListen = {
				on: sinon.stub(),
				subscribe: sinon.stub().callsArg(0)
			};

			const mockNWrite = {
				write: sinon.stub().callsArgWith(2, null)
			};

			const mockNListen = {
				on: sinon.stub(),
				subscribe: sinon.stub().callsArg(0)
			};
			const mockRssiListen = {
				on: sinon.stub(),
				subscribe: sinon.stub().callsArg(0)
			};
			const mockFileWrite = { write: sinon.stub() };

			delete require.cache[require.resolve("../fluffcon")];
			const fluffcon = require("../fluffcon");

			const mockPeripheral = {
				uuid: "test-uuid",
				connect: function(callback) {
					callback(null);
				},
				discoverServices: function(uuids, callback) {
					callback(null, [{
						discoverCharacteristics: function(charUuids, callback) {
							const chars = {
								"dab91383b5a1e29cb041bcd562613bde": mockGpWrite,
								"dab91382b5a1e29cb041bcd562613bde": mockGpListen,
								"dab90757b5a1e29cb041bcd562613bde": mockNWrite,
								"dab90756b5a1e29cb041bcd562613bde": mockNListen,
								"dab90755b5a1e29cb041bcd562613bde": mockRssiListen,
								"dab90758b5a1e29cb041bcd562613bde": mockFileWrite
							};
							const result = charUuids.map(uuid => {
								const char = Object.assign({}, chars[uuid]);
								char.uuid = uuid;
								return char;
							});
							callback(null, result);
						}
					}]);
				},
				disconnect: sinon.stub().callsArg(0)
			};

			fluffcon.connect(mockPeripheral, function(fluff) {
				fluff.stopIdle();
				
				const data = Buffer.from([0x09, 0x01, 0x00]);
				fluff.nordicWrite(data, function(error) {
					expect(error).to.equal(false);
					expect(mockNWrite.write.calledOnce).to.be.true;
					expect(mockNWrite.write.firstCall.args[0]).to.deep.equal(data);
					done();
				});
			});
		});
	});

	describe("writeToSlot", function() {
		it("should write data to file write characteristic", function(done) {
			const mockGpWrite = {
				write: sinon.stub()
			};

			const mockGpListen = {
				on: sinon.stub(),
				subscribe: sinon.stub().callsArg(0)
			};

			const mockNWrite = { write: sinon.stub() };
			const mockNListen = {
				on: sinon.stub(),
				subscribe: sinon.stub().callsArg(0)
			};
			const mockRssiListen = {
				on: sinon.stub(),
				subscribe: sinon.stub().callsArg(0)
			};
			const mockFileWrite = {
				write: sinon.stub().callsArgWith(2, null)
			};

			delete require.cache[require.resolve("../fluffcon")];
			const fluffcon = require("../fluffcon");

			const mockPeripheral = {
				uuid: "test-uuid",
				connect: function(callback) {
					callback(null);
				},
				discoverServices: function(uuids, callback) {
					callback(null, [{
						discoverCharacteristics: function(charUuids, callback) {
							const chars = {
								"dab91383b5a1e29cb041bcd562613bde": mockGpWrite,
								"dab91382b5a1e29cb041bcd562613bde": mockGpListen,
								"dab90757b5a1e29cb041bcd562613bde": mockNWrite,
								"dab90756b5a1e29cb041bcd562613bde": mockNListen,
								"dab90755b5a1e29cb041bcd562613bde": mockRssiListen,
								"dab90758b5a1e29cb041bcd562613bde": mockFileWrite
							};
							const result = charUuids.map(uuid => {
								const char = Object.assign({}, chars[uuid]);
								char.uuid = uuid;
								return char;
							});
							callback(null, result);
						}
					}]);
				},
				disconnect: sinon.stub().callsArg(0)
			};

			fluffcon.connect(mockPeripheral, function(fluff) {
				fluff.stopIdle();
				
				const data = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]);
				fluff.writeToSlot(data, function(error) {
					expect(error).to.equal(false);
					expect(mockFileWrite.write.calledOnce).to.be.true;
					expect(mockFileWrite.write.firstCall.args[0]).to.deep.equal(data);
					done();
				});
			});
		});
	});

	describe("callbacks", function() {
		it("should register and trigger GeneralPlus callbacks", function(done) {
			const mockGpWrite = {
				write: sinon.stub()
			};

			const mockGpListen = {
				on: sinon.stub(),
				subscribe: sinon.stub().callsArg(0)
			};

			const mockNWrite = { write: sinon.stub() };
			const mockNListen = {
				on: sinon.stub(),
				subscribe: sinon.stub().callsArg(0)
			};
			const mockRssiListen = {
				on: sinon.stub(),
				subscribe: sinon.stub().callsArg(0)
			};
			const mockFileWrite = { write: sinon.stub() };

			delete require.cache[require.resolve("../fluffcon")];
			const fluffcon = require("../fluffcon");

			const mockPeripheral = {
				uuid: "test-uuid",
				connect: function(callback) {
					callback(null);
				},
				discoverServices: function(uuids, callback) {
					callback(null, [{
						discoverCharacteristics: function(charUuids, callback) {
							const chars = {
								"dab91383b5a1e29cb041bcd562613bde": mockGpWrite,
								"dab91382b5a1e29cb041bcd562613bde": mockGpListen,
								"dab90757b5a1e29cb041bcd562613bde": mockNWrite,
								"dab90756b5a1e29cb041bcd562613bde": mockNListen,
								"dab90755b5a1e29cb041bcd562613bde": mockRssiListen,
								"dab90758b5a1e29cb041bcd562613bde": mockFileWrite
							};
							const result = charUuids.map(uuid => {
								const char = Object.assign({}, chars[uuid]);
								char.uuid = uuid;
								return char;
							});
							callback(null, result);
						}
					}]);
				},
				disconnect: sinon.stub().callsArg(0)
			};

			fluffcon.connect(mockPeripheral, function(fluff) {
				fluff.stopIdle();
				
				const callbackSpy = sinon.spy();
				fluff.addGeneralPlusCallback(callbackSpy);
				
				// Trigger the callback by simulating a data event
				const gpListenHandler = mockGpListen.on.getCalls().find(call => call.args[0] === "data");
				expect(gpListenHandler).to.exist;
				
				const testData = Buffer.from([0x24, 0x02]);
				gpListenHandler.args[1](testData);
				
				expect(callbackSpy.calledOnce).to.be.true;
				expect(callbackSpy.firstCall.args[0]).to.deep.equal(testData);
				done();
			});
		});

		it("should register and trigger Nordic callbacks", function(done) {
			const mockGpWrite = {
				write: sinon.stub()
			};

			const mockGpListen = {
				on: sinon.stub(),
				subscribe: sinon.stub().callsArg(0)
			};

			const mockNWrite = { write: sinon.stub() };
			const mockNListen = {
				on: sinon.stub(),
				subscribe: sinon.stub().callsArg(0)
			};
			const mockRssiListen = {
				on: sinon.stub(),
				subscribe: sinon.stub().callsArg(0)
			};
			const mockFileWrite = { write: sinon.stub() };

			delete require.cache[require.resolve("../fluffcon")];
			const fluffcon = require("../fluffcon");

			const mockPeripheral = {
				uuid: "test-uuid",
				connect: function(callback) {
					callback(null);
				},
				discoverServices: function(uuids, callback) {
					callback(null, [{
						discoverCharacteristics: function(charUuids, callback) {
							const chars = {
								"dab91383b5a1e29cb041bcd562613bde": mockGpWrite,
								"dab91382b5a1e29cb041bcd562613bde": mockGpListen,
								"dab90757b5a1e29cb041bcd562613bde": mockNWrite,
								"dab90756b5a1e29cb041bcd562613bde": mockNListen,
								"dab90755b5a1e29cb041bcd562613bde": mockRssiListen,
								"dab90758b5a1e29cb041bcd562613bde": mockFileWrite
							};
							const result = charUuids.map(uuid => {
								const char = Object.assign({}, chars[uuid]);
								char.uuid = uuid;
								return char;
							});
							callback(null, result);
						}
					}]);
				},
				disconnect: sinon.stub().callsArg(0)
			};

			fluffcon.connect(mockPeripheral, function(fluff) {
				fluff.stopIdle();
				
				const callbackSpy = sinon.spy();
				fluff.addNordicCallback(callbackSpy);
				
				// Trigger the callback by simulating a data event
				const nListenHandler = mockNListen.on.getCalls().find(call => call.args[0] === "data");
				expect(nListenHandler).to.exist;
				
				const testData = Buffer.from([0x01, 0x02, 0x03]);
				nListenHandler.args[1](testData);
				
				expect(callbackSpy.calledOnce).to.be.true;
				expect(callbackSpy.firstCall.args[0]).to.deep.equal(testData);
				done();
			});
		});
	});

	describe("stopIdle", function() {
		it("should stop the idle interval", function(done) {
			this.timeout(5000);
			
			const mockGpWrite = {
				write: sinon.stub().callsArgWith(2, null)
			};

			const mockGpListen = {
				on: sinon.stub(),
				subscribe: sinon.stub().callsArg(0)
			};

			const mockNWrite = { write: sinon.stub() };
			const mockNListen = {
				on: sinon.stub(),
				subscribe: sinon.stub().callsArg(0)
			};
			const mockRssiListen = {
				on: sinon.stub(),
				subscribe: sinon.stub().callsArg(0)
			};
			const mockFileWrite = { write: sinon.stub() };

			delete require.cache[require.resolve("../fluffcon")];
			const fluffcon = require("../fluffcon");

			const mockPeripheral = {
				uuid: "test-uuid",
				connect: function(callback) {
					callback(null);
				},
				discoverServices: function(uuids, callback) {
					callback(null, [{
						discoverCharacteristics: function(charUuids, callback) {
							const chars = {
								"dab91383b5a1e29cb041bcd562613bde": mockGpWrite,
								"dab91382b5a1e29cb041bcd562613bde": mockGpListen,
								"dab90757b5a1e29cb041bcd562613bde": mockNWrite,
								"dab90756b5a1e29cb041bcd562613bde": mockNListen,
								"dab90755b5a1e29cb041bcd562613bde": mockRssiListen,
								"dab90758b5a1e29cb041bcd562613bde": mockFileWrite
							};
							const result = charUuids.map(uuid => {
								const char = Object.assign({}, chars[uuid]);
								char.uuid = uuid;
								return char;
							});
							callback(null, result);
						}
					}]);
				},
				disconnect: sinon.stub().callsArg(0)
			};

			fluffcon.connect(mockPeripheral, function(fluff) {
				const initialCallCount = mockGpWrite.write.callCount;
				
				// Stop idle and wait to ensure no more calls are made
				fluff.stopIdle();
				
				setTimeout(() => {
					const finalCallCount = mockGpWrite.write.callCount;
					// Should not have increased significantly after stopping idle
					expect(finalCallCount - initialCallCount).to.be.lessThan(2);
					done();
				}, 3500);
			});
		});
	});
});
