import { createServer } from 'node:http';
import express from 'express';
import { WebSocketServer } from 'ws';
import { errorHandler, middleware, websocketServer } from '../lib/index.js';
import { Inspector } from '@exotjs/inspector';
import { MemoryStore } from '@exotjs/inspector/store';
import { AddressInfo } from 'node:net';

const inspector = new Inspector({
  store: new MemoryStore(),
});

inspector.activate();

const { trace } = inspector.instruments.traces;

const app = express();
const server = createServer(app);

app.use(middleware({
  inspector,
}));

app.get('/', (req, res) => {
  trace('router', (ctx) => {
    ctx.addAttribute('method', req.method);
    ctx.addAttribute('path', req.url || '/');
    setTimeout(() => {
      trace('response', () => {
        res.send('ok');
      });
    }, 150);
  });
});

app.get('/error', (req, res) => {
  throw new Error('test error');
});

app.use(errorHandler({
  inspector,
}));


server.listen(3002, () => {
  console.log('Server listening on port ' + (server.address() as AddressInfo)?.port);
});

websocketServer({
  authorize: async (req) => {
    // check request somehow, throw an error if not authorized
  },
  inspector,
  path: '/_inspector',
  server,
  ws: {
    noServer: true,
  },
});