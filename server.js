const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8787;
const ROOT = __dirname;
const recentEvents = [];

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
  });
  response.end(JSON.stringify(payload));
}

function sendFile(response, filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const typeMap = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8'
  };

  fs.readFile(filePath, function (error, content) {
    if (error) {
      sendJson(response, 404, { ok: false, error: 'Not found' });
      return;
    }

    response.writeHead(200, { 'Content-Type': typeMap[extension] || 'text/plain; charset=utf-8' });
    response.end(content);
  });
}

const server = http.createServer(function (request, response) {
  const url = new URL(request.url, 'http://localhost:' + PORT);

  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
    });
    response.end();
    return;
  }

  if (request.method === 'GET' && url.pathname === '/') {
    sendFile(response, path.join(ROOT, 'index.html'));
    return;
  }

  if (request.method === 'GET' && url.pathname === '/tracker.js') {
    sendFile(response, path.join(ROOT, 'tracker.js'));
    return;
  }

  if (request.method === 'GET' && url.pathname === '/events') {
    sendJson(response, 200, recentEvents);
    return;
  }

  if (request.method === 'POST' && url.pathname === '/track') {
    let body = '';

    request.on('data', function (chunk) {
      body += chunk;
    });

    request.on('end', function () {
      try {
        const event = JSON.parse(body || '{}');
        recentEvents.unshift(event);
        if (recentEvents.length > 25) {
          recentEvents.length = 25;
        }
        sendJson(response, 200, { ok: true, accepted: true, count: recentEvents.length });
      } catch (error) {
        sendJson(response, 400, { ok: false, error: String(error) });
      }
    });

    return;
  }

  sendJson(response, 404, { ok: false, error: 'Route not found' });
});

server.listen(PORT, function () {
  console.log('Local tracker test server running at http://localhost:' + PORT);
});
