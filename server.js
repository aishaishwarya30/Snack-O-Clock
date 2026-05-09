const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = process.env.PORT || 3000;
const publicDir = __dirname;
const dataDir = path.join(__dirname, "data");
const dbPath = path.join(dataDir, "db.json");
const menuPath = path.join(dataDir, "menu.json");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

function ensureDatabase() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }

  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(
      dbPath,
      JSON.stringify({ orders: [], franchise: [], newsletter: [] }, null, 2)
    );
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error("Request body is too large"));
      }
    });

    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

function addRecord(collection, payload) {
  const db = readJson(dbPath);
  const record = {
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    ...payload
  };

  db[collection].push(record);
  writeJson(dbPath, db);
  return record;
}

function serveStatic(req, res, pathname) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(publicDir, safePath));

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": mimeTypes[extension] || "application/octet-stream" });
    res.end(content);
  });
}

function renderAdminPage() {
  const db = readJson(dbPath);

  const renderList = (items, formatter) => {
    if (!items.length) return "<p>No records yet.</p>";
    return `<ul>${items.map((item) => `<li>${formatter(item)}</li>`).join("")}</ul>`;
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NightBite Admin</title>
  <style>
    body { font-family: Arial, sans-serif; background: #fff8f1; color: #171219; margin: 0; padding: 32px; }
    h1 { color: #ff5672; }
    section { background: #fff; border-radius: 8px; box-shadow: 0 12px 40px rgba(0,0,0,.08); margin: 20px 0; padding: 24px; }
    li { margin: 12px 0; line-height: 1.5; }
    strong { color: #171219; }
  </style>
</head>
<body>
  <h1>Snack-0-Clock Admin Dashboard</h1>
  <section>
    <h2>Orders</h2>
    ${renderList(db.orders, (item) => `<strong>${item.name}</strong> ordered ${item.item} - ${item.phone} - ${item.address}`)}
  </section>
  <section>
    <h2>Franchise Requests</h2>
    ${renderList(db.franchise, (item) => `<strong>${item.firstName} ${item.secondName}</strong> - ${item.contact} - ${item.email} - ${item.market}`)}
  </section>
  <section>
    <h2>Newsletter</h2>
    ${renderList(db.newsletter, (item) => `<strong>${item.email}</strong>`)}
  </section>
</body>
</html>`;
}

async function handleApi(req, res, pathname) {
  if (req.method === "GET" && pathname === "/api/menu") {
    sendJson(res, 200, readJson(menuPath));
    return;
  }

  if (req.method === "GET" && pathname === "/api/admin-data") {
    sendJson(res, 200, readJson(dbPath));
    return;
  }

  if (req.method === "POST" && pathname === "/api/orders") {
    const payload = await readBody(req);
    if (!payload.name || !payload.phone || !payload.address || !payload.item) {
      sendJson(res, 400, { message: "Please fill all required order fields." });
      return;
    }
    sendJson(res, 201, { message: "Order saved successfully.", order: addRecord("orders", payload) });
    return;
  }

  if (req.method === "POST" && pathname === "/api/franchise") {
    const payload = await readBody(req);
    if (!payload.firstName || !payload.secondName || !payload.contact || !payload.email || !payload.market) {
      sendJson(res, 400, { message: "Please fill all required franchise fields." });
      return;
    }
    sendJson(res, 201, { message: "Franchise request saved successfully.", request: addRecord("franchise", payload) });
    return;
  }

  if (req.method === "POST" && pathname === "/api/newsletter") {
    const payload = await readBody(req);
    if (!payload.email) {
      sendJson(res, 400, { message: "Email is required." });
      return;
    }
    sendJson(res, 201, { message: "Newsletter email saved successfully.", signup: addRecord("newsletter", payload) });
    return;
  }

  sendJson(res, 404, { message: "API route not found." });
}

ensureDatabase();

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (pathname.startsWith("/api/")) {
      await handleApi(req, res, pathname);
      return;
    }

    if (pathname === "/admin") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(renderAdminPage());
      return;
    }

    serveStatic(req, res, pathname);
  } catch (error) {
    sendJson(res, 500, { message: error.message || "Server error" });
  }
});

server.listen(PORT, () => {
  console.log(`Snack-0-Clock server running at http://localhost:${PORT}`);
  console.log(`Admin dashboard: http://localhost:${PORT}/admin`);
});
