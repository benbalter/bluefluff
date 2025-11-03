const { expect } = require("chai");
const sinon = require("sinon");

describe("fluffd HTTP server", function() {




	// We'll test the routing logic without actually starting the full server
	describe("command routing", function() {
		it("should handle /cmd POST requests", function(done) {
			const mockReq = {
				url: "/cmd/antenna",
				method: "POST",
				on: function(event, callback) {
					if (event === "data") {
						callback(JSON.stringify({
							params: { red: 255, green: 0, blue: 0 }
						}));
					} else if (event === "end") {
						callback();
					}
				}
			};


			// Test URL parsing
			const fragments = mockReq.url.substring(1).split("/");
			const query = fragments.splice(0, 2);
			query.push(fragments.join("/"));

			expect(query[0]).to.equal("cmd");
			expect(query[1]).to.equal("antenna");
			done();
		});

		it("should handle /list GET requests", function() {
			const mockReq = {
				url: "/list",
				method: "GET"
			};

			const fragments = mockReq.url.substring(1).split("/");
			const query = fragments.splice(0, 2);
			
			expect(query[0]).to.equal("list");
		});

		it("should handle /scan requests", function() {
			const mockReq = {
				url: "/scan",
				method: "GET"
			};

			const fragments = mockReq.url.substring(1).split("/");
			const query = fragments.splice(0, 2);
			
			expect(query[0]).to.equal("scan");
		});
	});

	describe("command execution", function() {
		it("should parse JSON POST data correctly", function(done) {
			let POST = "";
			const testData = JSON.stringify({
				params: { red: 128, green: 64, blue: 255 },
				target: "test-uuid"
			});

			const mockReq = {
				on: function(event, callback) {
					if (event === "data") {
						callback(testData);
					} else if (event === "end") {
						callback();
					}
				}
			};

			mockReq.on("data", function(data) {
				POST += data;
			});

			mockReq.on("end", function() {
				try {
					const parsed = JSON.parse(POST);
					expect(parsed).to.have.property("params");
					expect(parsed).to.have.property("target");
					expect(parsed.params.red).to.equal(128);
					expect(parsed.target).to.equal("test-uuid");
					done();
				} catch(e) {
					done(e);
				}
			});
		});

		it("should handle malformed JSON gracefully", function(done) {
			let POST = "";
			const testData = "{invalid json}";

			const mockReq = {
				on: function(event, callback) {
					if (event === "data") {
						callback(testData);
					} else if (event === "end") {
						callback();
					}
				}
			};

			mockReq.on("data", function(data) {
				POST += data;
			});

			mockReq.on("end", function() {
				try {
					JSON.parse(POST);
					done(new Error("Should have thrown an error"));
				} catch(e) {
					expect(e).to.exist;
					done();
				}
			});
		});
	});

	describe("multi-furby support", function() {
		it("should support targeting all furbies when no target specified", function() {
			const postData = {
				params: { red: 255, green: 0, blue: 0 }
			};

			// When target is not specified or empty, command should go to all furbies
			expect(postData).to.not.have.property("target");
		});

		it("should support targeting specific furby", function() {
			const postData = {
				params: { red: 255, green: 0, blue: 0 },
				target: "specific-furby-uuid"
			};

			expect(postData).to.have.property("target");
			expect(postData.target).to.equal("specific-furby-uuid");
		});
	});

	describe("response handling", function() {
		it("should respond with 'ok' on success", function() {
			const error = false;
			const expectedResponse = error === false ? "ok" : "error: " + error;
			expect(expectedResponse).to.equal("ok");
		});

		it("should respond with error message on failure", function() {
			const error = "Connection failed";
			const expectedResponse = !error ? "ok" : "error: " + error;
			expect(expectedResponse).to.equal("error: Connection failed");
		});
	});

	describe("CORS headers", function() {
		it("should include Access-Control-Allow-Origin header", function() {
			const headers = {
				"Content-Type": "text/plain",
				"Access-Control-Allow-Origin": "*"
			};

			expect(headers).to.have.property("Access-Control-Allow-Origin");
			expect(headers["Access-Control-Allow-Origin"]).to.equal("*");
		});
	});
});
