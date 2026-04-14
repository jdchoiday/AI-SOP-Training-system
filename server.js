// Local development server with API route support
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Load .env file for local development
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      line = line.trim();
      if (!line || line.startsWith('#')) return;
      const [key, ...rest] = line.split('=');
      if (key && rest.length > 0) {
        process.env[key.trim()] = rest.join('=').trim();
      }
    });
    console.log('[ENV] .env file loaded');
  }
} catch (e) {}

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  'html': 'text/html',
  'css': 'text/css',
  'js': 'application/javascript',
  'json': 'application/json',
  'png': 'image/png',
  'jpg': 'image/jpeg',
  'svg': 'image/svg+xml',
  'ico': 'image/x-icon',
  'mp3': 'audio/mpeg',
  'mp4': 'video/mp4',
  'webm': 'video/webm',
};

// Lazy-load API handlers
const apiHandlers = {};

function getApiHandler(name) {
  // 개발 모드: 매 요청마다 최신 코드 로드 (캐시 무효화)
  const modPath = path.join(__dirname, 'api', `${name}.js`);
  try {
    const resolved = require.resolve(modPath);
    delete require.cache[resolved];
    apiHandlers[name] = require(resolved);
  } catch (e) {
    console.error(`Failed to load API handler: ${name}`, e.message);
    return null;
  }
  return apiHandlers[name];
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // --- API routes ---
  if (pathname.startsWith('/api/')) {
    const apiName = pathname.replace('/api/', '').split('/')[0];
    const handler = getApiHandler(apiName);

    if (!handler) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: `API not found: ${apiName}` }));
    }

    // Parse body for POST requests (UTF-8 safe)
    if (req.method === 'POST') {
      const chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      await new Promise(resolve => req.on('end', resolve));
      try {
        const body = Buffer.concat(chunks).toString('utf8');
        req.body = JSON.parse(body);
      } catch (e) {
        req.body = {};
      }
    } else {
      req.body = {};
    }

    // Create a response wrapper compatible with Vercel's API
    const vercelRes = {
      _statusCode: 200,
      _headers: {},
      _body: null,
      _sent: false,

      setHeader(key, value) {
        this._headers[key] = value;
        return this;
      },
      status(code) {
        this._statusCode = code;
        return this;
      },
      json(data) {
        this._headers['Content-Type'] = 'application/json';
        this._body = JSON.stringify(data);
        this._send();
        return this;
      },
      send(data) {
        this._body = data;
        this._send();
        return this;
      },
      end(data) {
        this._body = data || '';
        this._send();
        return this;
      },
      _send() {
        if (this._sent) return;
        this._sent = true;
        res.writeHead(this._statusCode, this._headers);
        res.end(this._body);
      }
    };

    try {
      await handler(req, vercelRes);
    } catch (e) {
      console.error(`API error (${apiName}):`, e);
      if (!vercelRes._sent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    }
    return;
  }

  // --- Static files ---
  let filePath = pathname === '/' ? '/index.html'
               : pathname.endsWith('/') ? pathname + 'index.html'
               : pathname;
  const fullPath = path.join(__dirname, decodeURIComponent(filePath));

  // Security: prevent directory traversal
  if (!fullPath.startsWith(__dirname)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  // 디렉토리 경로면 index.html 자동 추가
  const stat = fs.existsSync(fullPath) && fs.statSync(fullPath);
  const resolvedPath = (stat && stat.isDirectory()) ? path.join(fullPath, 'index.html') : fullPath;

  fs.readFile(resolvedPath, (err, data) => {
    if (err) {
      // Try .html extension
      fs.readFile(resolvedPath + '.html', (err2, data2) => {
        if (err2) {
          res.writeHead(404);
          return res.end('Not found');
        }
        res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' });
        res.end(data2);
      });
      return;
    }
    const ext = path.extname(resolvedPath).slice(1);
    res.writeHead(200, {
      'Content-Type': (MIME_TYPES[ext] || 'application/octet-stream') + ';charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`SOP Training Server running on http://localhost:${PORT}`);
  console.log(`API routes: /api/tts, /api/gemini, /api/siliconflow`);
});
