const config = require("./config.json");
const app = require("./app");
const http = require("http");
const { Server } = require("socket.io");

const socketUploader = require("./lib/socketUpload");
const socketSearch = require("./lib/socketSearch");
const socketRequest = require("./lib/socketRequest");

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: config.devMode ? "*" : config.baseURL,
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  socketUploader(socket);
  socketSearch(socket);
  socketRequest(socket);
});

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
