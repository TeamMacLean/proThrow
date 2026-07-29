const config = require("./config.json");
const app = require("./app");
const http = require("http");
const thinky = require("./lib/thinky");
const { attachSockets } = require("./lib/socketServer");
const { assertConfigSafe } = require("./lib/configCheck");

// Before anything else: several config settings fail open and fail silently.
assertConfigSafe();

// Backstop. Node terminates the process on an unhandled rejection, so a single
// forgotten `await` on a notification could take the whole app down. Anything
// that reaches here is a bug worth the loud log, but it should not be fatal.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

const server = http.createServer(app);
attachSockets(server, app);

// Serve only once the database, tables and indexes are in place. Against an
// empty database the bootstrap is asynchronous, so accepting requests
// immediately meant the first ones could hit tables that did not exist yet.
thinky
  .ready()
  .catch((err) => {
    console.error("Database schema setup failed:", err.message);
    process.exit(1);
  })
  .then(() => {
    server.listen(config.port, "0.0.0.0", () => {
      console.log("\n" + "=".repeat(50));
      console.log("TSL Proteomics Server");
      console.log("=".repeat(50));
      console.log(`Port: ${config.port}`);
      console.log(`URL: ${config.baseURL}`);
      console.log(`Mode: ${config.devMode ? "Development" : "Production"}`);
      if (config.devMode && process.env.VPN_MODE === "true") {
        console.log("VPN Mode: Enabled (LDAP auth active)");
      }
      console.log("=".repeat(50) + "\n");
    });
  });
