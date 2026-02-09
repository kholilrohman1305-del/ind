const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;

// Diagnostic: write env info to file
const logFile = path.join(__dirname, "..", "startup.log");
const log = (msg) => {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try { fs.appendFileSync(logFile, line); } catch(e) { /* ignore */ }
  console.log(msg);
};

log(`Node ${process.version}, PORT=${PORT}, CWD=${process.cwd()}`);
log(`ENV keys: ${Object.keys(process.env).join(", ")}`);

// Minimal test server - replace with real app after confirming runtime works
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({
    status: "ok",
    node: process.version,
    port: PORT,
    time: new Date().toISOString(),
    env_keys: Object.keys(process.env),
  }));
});

server.listen(PORT, () => {
  log(`Test server running on port ${PORT}`);
});