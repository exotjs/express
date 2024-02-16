import type { IncomingMessage, Server } from 'http';
import type { Inspector } from '@exotjs/inspector';
import type { ServerOptions } from 'ws';

export interface ExotMiddlewareOptions {
  inspector: Inspector;
  traceIdHeader?: string;
}

export interface ExotErrorHandlerOptions {
  inspector: Inspector;
}

export interface ExotWebSocketServerOptions {
  authorize?: (req: IncomingMessage) => Promise<void> | void;
  inspector: Inspector;
  path?: string;
  server?: Server;
  ws?: ServerOptions;
}
