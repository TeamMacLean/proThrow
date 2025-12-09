// Test setup file for Jest
process.env.NODE_ENV = "test";

// Mock console methods if needed in tests
// jest.spyOn(console, 'log').mockImplementation(() => {});
// jest.spyOn(console, 'error').mockImplementation(() => {});

// Global test timeout
jest.setTimeout(10000);

// Clean up after all tests
afterAll(async () => {
  // Add any cleanup logic here
});
