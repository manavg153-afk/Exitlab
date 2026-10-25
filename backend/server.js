// ExitLab Assistant Backend Service
// Lightweight Node.js HTTP server (ES Module, zero external dependencies)
// Provides POST /api/assistant/run-question and GET /api/health

import http from 'node:http';
import { askAgent37, isAgent37Configured } from './agent37Adapter.js';

const PORT = Number(process.env.PORT) || 3001;
const MAX_BODY_BYTES = 64 * 1024; // 64 KB max payload

// Helper to write JSON responses with CORS headers
function sendJson(res, statusCode, data) {
  const payload = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // Health check endpoint
  if (req.method === 'GET' && (pathname === '/api/health' || pathname === '/health' || pathname === '/')) {
    sendJson(res, 200, {
      status: 'ok',
      service: 'exitlab-assistant',
      configured: isAgent37Configured(),
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Assistant Run Question endpoint
  if (req.method === 'POST' && pathname === '/api/assistant/run-question') {
    let rawBody = '';
    let bodyBytes = 0;

    req.on('data', (chunk) => {
      bodyBytes += chunk.length;
      if (bodyBytes > MAX_BODY_BYTES) {
        req.destroy();
        sendJson(res, 413, { error: 'Payload exceeds 64KB limit.' });
        return;
      }
      rawBody += chunk;
    });

    req.on('end', async () => {
      if (bodyBytes > MAX_BODY_BYTES) return;

      let parsed;
      try {
        parsed = rawBody ? JSON.parse(rawBody) : {};
      } catch (err) {
        sendJson(res, 400, { error: 'Invalid JSON body.' });
        return;
      }

      const { question, run, summary } = parsed;

      // Validate question
      if (!question || typeof question !== 'string' || question.trim().length === 0) {
        sendJson(res, 400, { error: 'Question string is required.' });
        return;
      }
      if (question.length > 1000) {
        sendJson(res, 400, { error: 'Question is too long (maximum 1000 characters).' });
        return;
      }

      // Validate run or summary
      const runData = run || summary;
      if (!runData) {
        sendJson(res, 400, { error: 'Run metrics data or summary is required.' });
        return;
      }

      try {
        const result = await askAgent37(question.trim(), runData);

        if (!result.success) {
          const status = !result.configured ? 503 : 502;
          sendJson(res, status, {
            error: result.error,
            configured: result.configured,
          });
          return;
        }

        sendJson(res, 200, {
          success: true,
          answer: result.answer,
          configured: true,
          disclaimer:
            'Explanatory suggestion based on cellular simulation metrics — not legal building-safety, fire code, or life-safety certification advice.',
        });
      } catch (e) {
        console.error('[Assistant Server] Unexpected error:', e);
        sendJson(res, 500, {
          error: 'An internal error occurred while processing the assistant request.',
          configured: isAgent37Configured(),
        });
      }
    });

    return;
  }

  // Not found
  sendJson(res, 404, { error: `Endpoint not found: ${pathname}` });
});

server.listen(PORT, () => {
  console.log(`[ExitLab Assistant Backend] Listening on port ${PORT}`);
  console.log(`[ExitLab Assistant Backend] Agent 37 Configured: ${isAgent37Configured()}`);
});
