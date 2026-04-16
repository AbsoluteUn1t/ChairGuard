#!/usr/bin/env node
/**
 * Mission Control Server
 * Serves the dashboard and proxies OpenClaw CLI data over simple HTTP endpoints.
 */
const http = require('http');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const ROOT = __dirname;

function json(cliCmd) {
  try {
    return JSON.parse(execSync(cliCmd, { timeout: 15000, encoding: 'utf8' }));
  } catch (e) {
    return { error: e.message };
  }
}

const routes = {
  '/openclaw/health':          () => json('openclaw health --json'),
  '/openclaw/status':           () => json('openclaw status --json'),
  '/openclaw/security-audit':   () => json('openclaw security audit --json'),
  '/openclaw/update-status':    () => json('openclaw update status --json'),
};

const mimeTypes = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json':'application/json',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
};

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  // API proxy
  if (routes[url]) {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(routes[url]()));
    return;
  }

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
    res.end();
    return;
  }

  // Static files
  let filePath = path.join(ROOT, url === '/' ? 'index.html' : url);
  if (!fs.existsSync(filePath)) filePath = path.join(ROOT, 'index.html');
  const ext = path.extname(filePath);
  const mime = mimeTypes[ext] || 'text/plain';
  try {
    res.writeHead(200, { 'Content-Type': mime });
    res.end(fs.readFileSync(filePath));
  } catch {
    res.writeHead(404); res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`Mission Control running at http://localhost:${PORT}`);
});
