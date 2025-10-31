# Tests for Performance Improvements

This directory contains test suites for validating the performance optimizations made to the bluefluff repository.

## JavaScript Tests

Located in `fluffd/test/`

### Running JavaScript Tests

```bash
cd fluffd
npm test
```

### Test Coverage

- **fluffaction.test.js**: Tests for Buffer.from() usage and DLC flashing interval optimization
  - Validates all commands use Buffer.from() instead of deprecated new Buffer()
  - Verifies 20ms interval is used for DLC flashing operations
  - Tests command execution and parameter handling

- **fluffcon.test.js**: Tests for Buffer.from() usage in idle interval
  - Validates startIdle() uses Buffer.from()
  - Tests Fluff class initialization and BLE characteristic handling

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

### Python
- Pillow: Image processing library (for visualization tests)

Install Python dependencies:
```bash
cd util
pip3 install -r requirements.txt
```

## CI Integration

To run all tests:

```bash
# JavaScript tests
cd fluffd && npm test

# Python tests
cd util/test && python3 -m unittest discover -v
```
