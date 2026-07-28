module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/test"],
  testMatch: ["**/*.test.js"],
  collectCoverageFrom: [
    "lib/**/*.js",
    "controllers/**/*.js",
    "models/**/*.js",
    "!**/node_modules/**",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  setupFilesAfterEnv: ["<rootDir>/test/setup.js"],
  // Creates the database schema once, before the parallel workers start, so
  // they cannot race each other into creating duplicate tables.
  globalSetup: "<rootDir>/test/globalSetup.js",
  testTimeout: 10000,
  verbose: true,
};
