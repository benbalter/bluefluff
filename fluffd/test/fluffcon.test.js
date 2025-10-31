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

	describe("Callback management", function() {
		it("should add and remove GeneralPlus callbacks", function(done) {
			// Mock the characteristics
			const mockGpWrite = {
				write: sinon.stub().callsArg(2)
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

			// Connect and test callback management
			fluffcon.connect(mockPeripheral, function(fluff) {
				fluff.stopIdle(); // Stop idle to prevent interference
				
				const callback1 = sinon.spy();
				const callback2 = sinon.spy();
				
				// Add callbacks
				fluff.addGeneralPlusCallback(callback1);
				fluff.addGeneralPlusCallback(callback2);
				
				// Trigger callbacks
				const testData = Buffer.from([0x24, 0x02]);
				mockGpListen.on.getCall(0).args[1](testData);
				
				expect(callback1.calledOnce).to.be.true;
				expect(callback2.calledOnce).to.be.true;
				
				// Remove first callback
				fluff.removeGeneralPlusCallback(callback1);
				
				// Trigger callbacks again
				mockGpListen.on.getCall(0).args[1](testData);
				
				// callback1 should not be called again, but callback2 should
				expect(callback1.calledOnce).to.be.true;
				expect(callback2.calledTwice).to.be.true;
				
				done();
			});
		});

		it("should add and remove Nordic callbacks", function(done) {
			// Mock the characteristics
			const mockGpWrite = {
				write: sinon.stub().callsArg(2)
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

			// Connect and test callback management
			fluffcon.connect(mockPeripheral, function(fluff) {
				fluff.stopIdle(); // Stop idle to prevent interference
				
				const callback1 = sinon.spy();
				const callback2 = sinon.spy();
				
				// Add callbacks
				fluff.addNordicCallback(callback1);
				fluff.addNordicCallback(callback2);
				
				// Trigger callbacks
				const testData = Buffer.from([0x09, 0x02]);
				mockNListen.on.getCall(0).args[1](testData);
				
				expect(callback1.calledOnce).to.be.true;
				expect(callback2.calledOnce).to.be.true;
				
				// Remove first callback
				fluff.removeNordicCallback(callback1);
				
				// Trigger callbacks again
				mockNListen.on.getCall(0).args[1](testData);
				
				// callback1 should not be called again, but callback2 should
				expect(callback1.calledOnce).to.be.true;
				expect(callback2.calledTwice).to.be.true;
				
				done();
			});
		});
	});
});
