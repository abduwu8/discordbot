import { createServer, type Server } from 'node:http';
import type { Client } from 'discord.js';
import { logger } from '../utils/logger.js';

export function startHealthServer(port: number, client: Client): Server {
  const server = createServer((req, res) => {
    const path = req.url?.split('?')[0] ?? '/';

    if (req.method === 'GET' && (path === '/' || path === '/health')) {
      const ready = client.isReady();
      const body = JSON.stringify({
        ok: true,
        status: ready ? 'ok' : 'starting',
        bot: ready ? (client.user?.tag ?? null) : null,
      });

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      });
      res.end(body);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  });

  server.listen(port, '0.0.0.0', () => {
    logger.info(`Health server listening on 0.0.0.0:${port}`);
  });

  return server;
}
