import { AddressInfo, WebSocketServer } from 'ws';
import type { IncomingMessage } from 'http';
import type { Request, Response, NextFunction } from 'express';
import type {
  ExotErrorHandlerOptions,
  ExotMiddlewareOptions,
  ExotWebSocketServerOptions,
} from '../lib/types.js';

export function errorHandler(options: ExotErrorHandlerOptions) {
  const { inspector } = options;
  return function exotErrorHandler(
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    inspector.instruments.errors.push(
      {
        attributes: {
          method: req.method,
          path: req.path,
        },
        message: String(err.message || err),
        stack: err?.stack,
        server: true,
      },
      'express'
    );
    next();
  };
}

export function middleware(options: ExotMiddlewareOptions) {
  const { inspector, traceIdHeader = 'X-Trace-Id' } = options;

  const { addAttribute, trace } = inspector.instruments.traces;

  return function exotMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    trace(
      'request',
      async (ctx) => {
        return new Promise((resolve) => {
          if (traceIdHeader && ctx.rootSpan?.uuid) {
            res.header(traceIdHeader, ctx.rootSpan.uuid);
          }
          ctx.addAttribute('method', req.method);
          ctx.addAttribute('path', req.path);
          res.once('finish', () => {
            addAttribute(ctx.rootSpan!, 'status', res.statusCode);
            resolve(void 0);
          });
          next();
        });
      },
      {
        onEnd(ctx) {
          const status = String(res.statusCode).slice(0, 1) + 'xx';
          inspector.instruments.metrics.push({
            'response:latency': [
              {
                values: [ctx.rootSpan!.duration],
              },
            ],
            [`response:${status}`]: [
              {
                values: [1],
              },
            ],
          });
        },
      }
    );
  };
}

export function websocketServer(
  options: ExotWebSocketServerOptions
): Promise<string | AddressInfo> {
  const { authorize, inspector, path = '/', server, ws = {} } = options;
  const wss = new WebSocketServer({
    ...ws,
    perMessageDeflate: false,
  });
  const checkPath = (req: IncomingMessage) => {
    const requestPath = String(req.url || '/').split('?')[0];
    if (requestPath !== path) {
      req.socket.destroy();
      return false;
    }
    return true;
  };
  wss.on('connection', async (ws, req) => {
    if (!server) {
      if (checkPath(req)) {
        return req.socket.destroy();
      }
      if (authorize) {
        try {
          await authorize(req);
        } catch (err) {
          return req.socket.destroy();
        }
      }
    }
    const remoteAddress = req.socket.remoteAddress;
    const session = inspector.createSession({
      remoteAddress,
    });
    session.on('message', (data) => {
      ws.send(data);
    });
    ws.on('close', () => {
      session.destroy();
    });
    ws.on('message', (message) => {
      session.handleMessage(message);
    });
  });
  if (server) {
    server.on('upgrade', async (req, socket, head) => {
      if (checkPath(req)) {
        if (authorize) {
          try {
            await authorize(req);
          } catch (err) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            return socket.destroy();
          }
        }
        wss.handleUpgrade(req, socket, head, (websocket) => {
          wss.emit('connection', websocket, req);
        });
      }
    });
  }
  return new Promise((resolve, reject) => {
    wss.once('error', reject);
    wss.once('listening', () => {
      wss.off('error', reject);
      resolve(wss.address());
    });
  });
}
