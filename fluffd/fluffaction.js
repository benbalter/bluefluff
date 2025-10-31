const winston = require("./logger");
const fs = require("fs");
let commands = {};

/*** GeneralPlus Actions ***/
commands["antenna"] = {
	run: function (fluff, params, callback) {
		fluff.generalPlusWrite(Buffer.from([0x14, params.red, params.green, params.blue]), callback);
	},
	readable: "Antenna Color",
	description: "Set Antenna Color",
	params: {
		red: "Brightness of red antenna LED (0-255)",
		green: "Brightness of green antenna LED (0-255)",
		blue: "Brightness of blue antenna LED (0-255)",
	}
};

commands["debug"] = {
	run: function (fluff, params, callback) {
		fluff.generalPlusWrite(Buffer.from([0xdb]), callback);
	},
	readable: "Debug Screen",
	description: "Cycle through LCD eye debug menus"
};

commands["lcd"] = {
	run: function (fluff, params, callback) {
		fluff.generalPlusWrite(Buffer.from([0xcd, params.state]), callback);
	},
	readable: "LCD Light",
	description: "Set LCD Eyes Background Light",
	params: {
		state: "0 for off, 1 for on"
	}
};

commands["action"] = {
	run: function (fluff, params, callback) {
		fluff.generalPlusWrite(Buffer.from([0x13, 0x00, params.input, params.index, params.subindex, params.specific]), callback);
	},
	readable: "Action",
	description: "Furby move / talk action",
	params: {
		input: "Where to find the action",
		index: "Index of actions",
		subindex: "Subindex of action",
		specific: "Specific action"
	}
};

commands["setname"] = {
	run: function (fluff, params, callback) {
		// 0x21: Actually set name, 0x13: action to say name afterwards
		fluff.generalPlusWriteSequence([
			Buffer.from([0x21, params.name]),
			Buffer.from([0x13, 0x00, 0x21, 0x00, 0x00, params.name])
		], callback);
	},
	readable: "Set Name",
	description: "Set new Name and announce it",
	params: {
		name: "New name, value from 0-128"
	}
};

commands["custom"] = {
	run: function (fluff, params, callback) {
		fluff.generalPlusWrite(Buffer.from(params.cmd, "hex"), callback);
	},
	readable: "Custom Command",
	description: "Send arbitrary command to GeneralPlus",
	params: {
		cmd: "Command in hexadecimal format"
	}
};

commands["setidle"] = {
	run: function (fluff, params) {
		if (params.idle === "1")
			fluff.startIdle();
		if (params.idle === "0")
			fluff.stopIdle();
	},
	readable: "Set Idle",
	description: "Enable or disable keeping Furby quiet",
	params: {
		idle: "1 = keep quiet (idle), 0 = don't idle"
	}
};

commands["moodmeter"] = {
	run: function (fluff, params, callback) {
		fluff.generalPlusWrite(Buffer.from([0x23, params.action, params.type, params.value]), callback);
	},
	readable: "Set Moodmeter",
	description: "Enable or disable keeping Furby quiet",
	params: {
		action: "1 = set value, 0 = increase value",
		type: "0 = Excited, 1 = Displeased, 2 = Tired, 3 = Fullness, 4 = Wellness",
		value: "New value (action 1) or delta (action 0)"
	}
};

/*** Nordic Actions ***/
commands["nordic_custom"] = {
	run: function (fluff, params, callback) {
		fluff.nordicWrite(Buffer.from(params.cmd, "hex"), callback);
	},
	readable: "Custom Nordic",
	description: "Send arbitrary command to Nordic",
	params: {
		cmd: "Command in hexadecimal format"
	}
};

commands["nordic_packetack"] = {
	run: function (fluff, params, callback) {
		fluff.nordicWrite(Buffer.from([0x09, params.state, 0x00]), callback);
	},
	readable: "Set Nordic Packet ACK",
	description: "Enable / disable nordic packet ACK messages for file writing",
	params: {
		state: "0 for off, 1 for on"
	}
};

/*** DLC-related Actions ***/
commands["dlc_delete"] = {
	run: function (fluff, params, callback) {
		fluff.generalPlusWrite(Buffer.from([0x74, params.slot]), callback);
	},
	readable: "Delete DLC",
	description: "Delete DLC from slot with ID",
	params: {
		slot: "Slot to be deleted (number)"
	}
};

commands["flashdlc"] = {
	run : function (fluff, params, callback) {
		let dlcsize;
		try {
			dlcsize = fs.statSync(params.dlcfile)["size"];
		} catch (error) {
			winston.error("FlashDLC: Error accessing file: " + error);
			if (callback) callback("Error accessing file: " + error);
			return;
		}

		// Not sure what buf_slot does?? Is it really the DLC slot??
		let buf_cmd = Buffer.from([0x50, 0x00]);
		let buf_size = Buffer.from([dlcsize >> 16 & 0xff, dlcsize >> 8 & 0xff, dlcsize & 0xff]);
		let buf_slot = Buffer.from([0x02]);
		let buf_filename = Buffer.from(params.filename);
		let buf_end = Buffer.from([0x00, 0x00]);
		let cmd_prepare = Buffer.concat([buf_cmd, buf_size, buf_slot, buf_filename, buf_end]);

		let readyCallback = null;
		let completeCallback = null;
		let flashTimeout = null;
		let flashint = null;

		// Cleanup function to remove callbacks and clear intervals/timeouts
		const cleanup = function() {
			if (flashint) clearInterval(flashint);
			if (flashTimeout) clearTimeout(flashTimeout);
			if (readyCallback) fluff.removeGeneralPlusCallback(readyCallback);
			if (completeCallback) fluff.removeGeneralPlusCallback(completeCallback);
		};

		fluff.generalPlusWrite(cmd_prepare, function(error) {
			if (error) {
				cleanup();
				if (callback) callback(error);
				return;
			}
		});

		// Set timeout for the entire flash operation (10 minutes)
		flashTimeout = setTimeout(function() {
			cleanup();
			winston.error("FlashDLC: Timeout waiting for flash to complete");
			if (callback) callback("Flash operation timed out");
		}, 600000);

		// Wait until GeneralPlus is ready to receive (sends 24:02 response)
		readyCallback = function (data) {
			if (!(data[0] == 0x24 && data[1] == 0x02))
				return;
			winston.info("FlashDLC: Got Ready to Receive");
			fluff.removeGeneralPlusCallback(readyCallback);
			readyCallback = null;

			fs.readFile(params.dlcfile, function (error, dlc) {
				if (error) {
					cleanup();
					winston.error("FlashDLC: Error reading file: " + error);
					if (callback) callback("Error reading file: " + error);
					return;
				}

				// Write DLC piece by piece
				let offset = 0;
				const totalChunks = Math.ceil(dlc.length / 20);
				let lastProgressReport = 0;

				// Wait for completion notification (24:05 response)
				completeCallback = function(data) {
					if (data[0] == 0x24 && data[1] == 0x05) {
						cleanup();
						winston.info("FlashDLC: Flash completed successfully");
						if (callback) callback(false);
					}
				};
				fluff.addGeneralPlusCallback(completeCallback);

				// Use 20ms interval instead of 5ms to reduce overhead while maintaining throughput
				flashint = setInterval(function () {
					const piece = dlc.slice(offset, offset + 20);
					
					fluff.writeToSlot(piece, function(error) {
						if (error) {
							cleanup();
							winston.error("FlashDLC: Error writing to slot: " + error);
							if (callback) callback("Error writing to slot: " + error);
						}
					});

					offset += 20;
					
					// Progress reporting every 10%
					const currentChunk = Math.floor(offset / 20);
					const progress = Math.floor((currentChunk / totalChunks) * 100);
					if (progress >= lastProgressReport + 10 && progress < 100) {
						winston.info("FlashDLC: Progress " + progress + "%");
						lastProgressReport = progress;
					}

					// End of buffer: Stop writing
					if (piece.length < 20) {
						clearInterval(flashint);
						flashint = null;
						winston.info("FlashDLC: All data sent, waiting for completion notification");
					}
				}, 20);
			});
		};
		fluff.addGeneralPlusCallback(readyCallback);
	},
	readable: "Flash DLC file",
	description: "Flash DLC file to slot on Furby",
	params: {
		filename: "DLC filename, e.g. TU003410.DLC",
		dlcfile: "Path to DLC file on fluffd server"
	}
};

commands["dlc_load"] = {
	run: function (fluff, params, callback) {
		fluff.generalPlusWrite(Buffer.from([0x60, params.slot]), callback);
	},
	readable: "Load DLC",
	description: "Load DLC for activation",
	params: {
		slot: "DLC slot to be loaded (number)"
	}
};

commands["dlc_activate"] = {
	run: function (fluff, params, callback) {
		fluff.generalPlusWrite(Buffer.from([0x61]), callback);
	},
	readable: "Activate DLC",
	description: "Activate loaded DLC - use after 'Load DLC'"
};

commands["dlc_deactivate"] = {
	run: function (fluff, params, callback) {
		fluff.generalPlusWrite(Buffer.from([0x62, params.slot]), callback);
	},
	readable: "Deactivate DLC",
	description: "Deactivate DLC slot without deleting it",
	params: {
		slot: "DLC slot to be deactivated (number)"
	}
};

/*** Preprogrammed buttons that you can add yourself ***/
commands["other"] = {
	run: function (fluff, params, callback) {
		fluff.generalPlusWrite(Buffer.from([0x13, 0x00, params.input, params.index, params.subindex, params.specific]), callback);
	},
	readable: "Preprogrammed Actions",
	description: "Furby move / talk buttons",
	buttons: {
		"giggle": {
			"readable": "Giggle",
			"cmd": "action",
			"params": {"input": 55, "index": 2, "subindex": 14, "specific": 0}
		},
		"puke": {
			"readable": "Puke",
			"cmd": "action",
			"params": {"input": 56, "index": 3, "subindex": 15, "specific": 1}
		},
		"name": {"readable": "Say a Name", "cmd": "setname", "params": {"name": 3}},
		"antennaoff": {
			"readable": "Turn Antenna LED Off",
			"cmd": "antenna",
			"params": {"red": 0, "blue": 0, "green": 0}
		},
		"antennared": {"readable": "Antenna LED Red", "cmd": "antenna", "params": {"red": 255, "blue": 0, "green": 0}},
		"antennablue": {
			"readable": "Antenna LED Blue",
			"cmd": "antenna",
			"params": {"red": 0, "blue": 255, "green": 0}
		},
		"antennagreen": {
			"readable": "Antenna LED Green",
			"cmd": "antenna",
			"params": {"red": 0, "blue": 0, "green": 255}
		},
	}
};

module.exports = {
	execute: function (fluff, cmd, params, callback) {
		if (!commands[cmd])
			winston.error("Command not found: " + cmd);
		else
			commands[cmd].run(fluff, params, callback);
	},

	list: function () {
		let list = {};

		// Remove functions from list
		for (let c in commands) {
			list[c] = {
				readable: commands[c].readable,
				description: commands[c].description,
				params: commands[c].params,
				buttons: commands[c].buttons
			};
		}

		return list;
	}
};
