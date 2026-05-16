const http = require("http");
const fs   = require("fs");
const path = require("path");

const PORT = 3001;
const ROOT = __dirname;

const MIME = {
  ".html": "text/html",
  ".css":  "text/css",
  ".js":   "application/javascript",
  ".json": "application/json",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif":  "image/gif",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
  ".woff": "font/woff",
  ".woff2":"font/woff2",
  ".ttf":  "font/ttf",
};

const server = http.createServer((req, res) => {
  let urlPath = req.url.split("?")[0];
  if (urlPath === "/") urlPath = "/index.html";

  const filePath = path.join(ROOT, urlPath);

  // Prevent directory traversal outside project root
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  console.log(`${req.method} ${urlPath}  →  ${filePath}`);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      console.log(`  404: ${err.code}`);
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end(`404 — Not found: ${urlPath}\nLooked for: ${filePath}`);
      return;
    }
    const ext  = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": mime });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`FLAMMABLEBUMP overlay server running at http://localhost:${PORT}/`);
  console.log("Press Ctrl+C to stop.\n");
  console.log("Scenes:");
  console.log(`  http://localhost:${PORT}/scenes/starting-soon.html`);
  console.log(`  http://localhost:${PORT}/scenes/gameplay-overlay.html`);
  console.log(`  http://localhost:${PORT}/scenes/intermission.html`);
  console.log(`  http://localhost:${PORT}/scenes/brb.html`);
  console.log(`  http://localhost:${PORT}/scenes/ending.html`);
  console.log("\nWidgets:");
  console.log(`  http://localhost:${PORT}/widgets/alert-box.html`);
  console.log(`  http://localhost:${PORT}/widgets/chatbox.html`);
  console.log(`  http://localhost:${PORT}/widgets/counter-widget.html`);
  console.log(`  http://localhost:${PORT}/widgets/goal-bar.html`);
  console.log(`  http://localhost:${PORT}/widgets/hype-meter.html`);
  console.log(`  http://localhost:${PORT}/widgets/viewer-list.html`);
  console.log(`  http://localhost:${PORT}/widgets/webcam-border.html`);
  console.log(`  http://localhost:${PORT}/widgets/control-panel.html`);
});
