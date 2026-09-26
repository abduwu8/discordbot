import { createServer, type Server } from 'node:http';
import type { Client } from 'discord.js';
import { gatewayState } from '../discord/gatewayWatch.js';
import { logger } from '../utils/logger.js';

export function startHealthServer(port: number, client: Client): Server {
  const server = createServer((req, res) => {
    const path = req.url?.split('?')[0] ?? '/';

    if (req.method === 'GET' && (path === '/' || path === '/health')) {
      const ready = client.isReady();
      const status = ready ? 'ok' : gatewayState.everReady ? 'disconnected' : 'starting';
      const body = JSON.stringify({
        ok: ready,
        status,
        bot: ready ? (client.user?.tag ?? null) : null,
        ping: ready ? client.ws.ping : null,
      });

      // 503 only after a successful login then a drop. Startup must stay 200
      // or Render restarts the service before Discord can connect.
      const httpStatus = path === '/' || status !== 'disconnected' ? 200 : 503;

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
