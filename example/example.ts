import { createServer } from 'node:http';
import express from 'express';
import { errorHandler, middleware, websocketServer } from '../lib/index.js';
import { Inspector } from '@exotjs/inspector';
import { MemoryStore } from '@exotjs/inspector/store';
import { AddressInfo } from 'node:net';

const inspector = new Inspector({
  store: new MemoryStore(),
});

const app = express();
const server = createServer(app);

app.use(middleware({
  inspector,
}));

app.get('/', (req, res) => {
  res.send('Hello.');
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