# Tests for Performance Improvements

[![Tests](https://github.com/benbalter/bluefluff/workflows/Tests/badge.svg)](https://github.com/benbalter/bluefluff/actions/workflows/test.yml)

This directory contains test suites for validating the performance optimizations made to the bluefluff repository.

## Continuous Integration

Tests are automatically run on every push and pull request via GitHub Actions. The CI pipeline runs:
- JavaScript tests on Node.js 18.x and 20.x
- Python tests on Python 3.10, 3.11, and 3.12
- ESLint for code quality

View the [workflow file](.github/workflows/test.yml) for details.

## JavaScript Tests

Located in `fluffd/test/`

### Running JavaScript Tests

```bash
cd fluffd
npm test
```

### Test Coverage

- **fluffaction.test.js**: Comprehensive tests for Buffer.from() usage and command execution
  - Validates all commands use Buffer.from() instead of deprecated new Buffer()
  - Tests antenna, debug, LCD, action, custom commands
  - Tests setname command with sequence execution
  - Tests moodmeter commands for all mood types
  - Tests all DLC operations (delete, load, activate, deactivate, flash)
  - Tests Nordic commands (custom and packet ACK)
  - Tests setidle command (start/stop idle mode)
  - Verifies 20ms interval is used for DLC flashing operations
  - Tests command listing functionality

- **fluffcon.test.js**: Comprehensive tests for Fluff class BLE operations
  - Validates startIdle() uses Buffer.from()
  - Tests generalPlusWriteSequence for multi-command execution
  - Tests nordicWrite for Nordic microcontroller communication
  - Tests writeToSlot for DLC file writing
  - Tests callback registration and triggering (GeneralPlus and Nordic)
  - Tests stopIdle functionality
  - Validates proper BLE characteristic handling

- **fluffd.test.js**: Tests for HTTP server functionality
  - Tests command routing (/cmd, /list, /scan endpoints)
  - Tests JSON POST data parsing
  - Tests error handling for malformed JSON
  - Tests multi-furby command targeting
  - Tests response handling (success and error cases)
  - Validates CORS headers

- **logger.test.js**: Tests for logging configuration
  - Tests LOG_LEVEL environment variable configuration
  - Tests default log level (debug)
  - Tests all log levels (debug, info, warn, error, verbose)
  - Tests production vs development mode transport configuration
  - Validates winston logger instance creation
  - Tests logging methods functionality
  - Tests log level filtering

## Python Tests

Located in `util/test/`

### Running Python Tests

```bash
cd util/test
python3 -m unittest discover -v
```

### Test Coverage

- **test_visualize_audio.py**: Tests for buffered I/O in audio visualization
  - Validates LINES_PER_CHUNK constant is defined
  - Tests chunked reading (100 lines per chunk)
  - Verifies correct image output dimensions

- **test_toimage.py**: Tests for buffered I/O in image conversion
  - Validates LINES_PER_CHUNK constant is defined
  - Tests chunked reading (100 lines per chunk)
  - Verifies correct image output dimensions

- **test_inject_binary.py**: Tests for smart buffering in binary injection
  - Validates BUFFER_SIZE constant (8KB)
  - Tests chunk_has_payload() helper function
  - Verifies correct payload injection at specified offsets

## Dependencies

### JavaScript
- mocha: Test framework
- chai: Assertion library
- sinon: Mocking and stubbing library

Install JavaScript dependencies:
```bash
cd fluffd
npm install
```

### Python
- Pillow: Image processing library (for visualization tests)

Install Python dependencies:
```bash
cd util
pip3 install -r requirements.txt
```

## Test Summary

**JavaScript Tests:** 49 passing
- fluffaction.js: 20 tests
- fluffcon.js: 17 tests
- fluffd.js: 10 tests
- logger.js: 12 tests

**Python Tests:** 9 passing
- test_visualize_audio.py: 3 tests
- test_toimage.py: 3 tests
- test_inject_binary.py: 3 tests

**Total:** 58 comprehensive tests covering all major functionality

## CI Integration

To run all tests:

```bash
# JavaScript tests
cd fluffd && npm test

# Python tests
cd util/test && python3 -m unittest discover -v
```

## Test Philosophy

These tests follow best practices:
- **Unit tests** for individual functions and methods
- **Integration tests** for BLE communication and HTTP routing
- **Mock objects** to avoid hardware dependencies
- **Comprehensive coverage** of happy paths and error cases
- **Performance validation** for optimized code paths
