// Test setup file for Jest
process.env.NODE_ENV = "test";

// Global test timeout
jest.setTimeout(10000);

// Clean up after all tests
afterAll(async () => {
  try {
    const thinky = require("../lib/thinky");
    if (thinky && thinky.r && thinky.r.getPoolMaster) {
      const poolMaster = thinky.r.getPoolMaster();
      if (poolMaster && typeof poolMaster.drain === "function") {
        // First wait for any outstanding queries to finish setup logic (like databaseReady)
        await thinky.ready();

        // Then properly drain the connections
        await poolMaster.drain();
      }
    }
  } catch (_e) {
    // ignore
  }
});
