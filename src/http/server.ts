import { createServer, type Server } from 'node:http';
import type { Client } from 'discord.js';
import { logger } from '../utils/logger.js';

export function startHealthServer(port: number, client: Client): Server {
  const server = createServer((req, res) => {
    const path = req.url?.split('?')[0] ?? '/';

    if (req.method === 'GET' && (path === '/' || path === '/health')) {
      const ready = client.isReady();
      const body = JSON.stringify({
        ok: ready,
        status: ready ? 'ok' : 'disconnected',
        bot: ready ? (client.user?.tag ?? null) : null,
        ping: ready ? client.ws.ping : null,
      });

      // `/` stays 200 so uptime pings keep the free instance awake even during
      // a brief reconnect. `/health` is 503 when the Discord gateway is down
      // so Render recycles the process instead of serving a dead bot.
      const httpStatus = path === '/' || ready ? 200 : 503;

      res.writeHead(httpStatus, {
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
