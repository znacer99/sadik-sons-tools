const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const db = require('./db.cjs');

const PORT = process.env.PORT || 3000;
const DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript',
  '.cjs': 'application/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  });
  res.end(JSON.stringify(data));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const urlParts = req.url.split('?');
  const reqPath = urlParts[0];

  // Enable CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  // --- REST API ENDPOINTS ---
  if (reqPath.startsWith('/api/')) {
    try {
      // GET /api/config
      if (reqPath === '/api/config' && req.method === 'GET') {
        const localIP = getLocalIP();
        return sendJson(res, 200, {
          localIP: localIP,
          port: PORT,
          hostUrl: `http://${localIP}:${PORT}`
        });
      }

      // GET /api/tools
      if (reqPath === '/api/tools' && req.method === 'GET') {
        return sendJson(res, 200, db.getTools());
      }

      // GET /api/tools/:id
      if (reqPath.startsWith('/api/tools/') && req.method === 'GET') {
        const id = decodeURIComponent(reqPath.replace('/api/tools/', ''));
        const tool = db.getTool(id);
        if (!tool) return sendJson(res, 404, { error: 'Tool not found' });
        return sendJson(res, 200, tool);
      }

      // POST /api/tools
      if (reqPath === '/api/tools' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const newTool = db.addTool(body);
        return sendJson(res, 201, newTool);
      }

      // POST /api/checkout
      if (reqPath === '/api/checkout' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const updated = db.checkoutTool(body);
        return sendJson(res, 200, updated);
      }

      // POST /api/checkin
      if (reqPath === '/api/checkin' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const updated = db.checkinTool(body);
        return sendJson(res, 200, updated);
      }

      // GET /api/technicians
      if (reqPath === '/api/technicians' && req.method === 'GET') {
        return sendJson(res, 200, db.getTechnicians());
      }

      // GET /api/sites
      if (reqPath === '/api/sites' && req.method === 'GET') {
        return sendJson(res, 200, db.getSites());
      }

      // GET /api/logs
      if (reqPath === '/api/logs' && req.method === 'GET') {
        return sendJson(res, 200, db.getLogs());
      }

      // GET /api/stats
      if (reqPath === '/api/stats' && req.method === 'GET') {
        return sendJson(res, 200, db.getStats());
      }

      // GET /api/backup
      if (reqPath === '/api/backup' && req.method === 'GET') {
        const dbFile = path.join(DIR, 'sadik_sons_database.json');
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="sadik_sons_backup.json"'
        });
        fs.createReadStream(dbFile).pipe(res);
        return;
      }

      return sendJson(res, 404, { error: 'API endpoint not found' });
    } catch (apiErr) {
      console.error('API Error:', apiErr);
      return sendJson(res, 400, { error: apiErr.message || 'Server API Error' });
    }
  }

  // --- STATIC WEB PAGE ROUTING ---
  
  // Route: /scan or /scan?id=... -> mobile-scan.html
  if (reqPath === '/scan' || reqPath === '/scan.html' || reqPath === '/mobile') {
    const mobilePath = path.join(DIR, 'mobile-scan.html');
    fs.readFile(mobilePath, (err, content) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error loading mobile scan page');
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=UTF-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      res.end(content);
    });
    return;
  }

  // Route: Main Index / Fallback
  let targetFile = reqPath === '/' || reqPath === '' ? 'index.html' : reqPath;
  const filePath = path.join(DIR, targetFile);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      const indexPath = path.join(DIR, 'index.html');
      fs.readFile(indexPath, (readErr, content) => {
        if (readErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
          return;
        }
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=UTF-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        res.end(content);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server Error');
        return;
      }
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      res.end(content);
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log('====================================================');
  console.log('  ⚡ SADIK SONS | Tool Custody & Asset Network');
  console.log('====================================================');
  console.log(`  > Desktop App:   http://localhost:${PORT}`);
  console.log(`  > Office Network: http://${localIP}:${PORT}`);
  console.log(`  > Phone Action:   http://${localIP}:${PORT}/scan?id=SS-TL-001`);
  console.log('====================================================');
});
