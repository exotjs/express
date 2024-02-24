# Express Middleware for Exot Inspector

This package includes an Express middleware for automatic request tracing, an error handler for tracking Express errors, and a WebSocket server for communication between the server and the app.

## Features

- Automatic request tracing (use `middleware` to enable)
- Error tracking (use `errorHandler` to enable)
- Built-in WebSocket server for server-app communication channel

## Usage

```ts
import { createServer } from 'node:http';
import { errorHandler, middleware, websocketServer } from '@exotjs/express';
import { Inspector } from '@exotjs/express/inspector';
import { MemoryStore } from '@exotjs/express/store';
import express from 'express';

const app = express();

// 1. Instantiate the inspector
const inspector = new Inspector({
  store: new MemoryStore(),
});

const server = createServer(app);

// 2. Mount the middleware
app.use(middleware({
  inspector,
}));

app.get('/', (req, res) => {
  res.send('Hello');
});

// 3. Mount the error handler
app.use(errorHandler({
  inspector,
}));

server.listen(3002);

// 4. Start the websocket server
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

```

## Tracing

Use the `trace` function exported by the traces instrument. It works automatically even for nested traces, without passing around any context.

```ts
const { trace } = inspector.instruments.trace;

// Now simply use `trace()` anywhere in your code
trace('mytrace', () => {
  // some work...
})
```

## Contributing

See [Contributing Guide](https://github.com/exotjs/express/blob/main/CONTRIBUTING.md) and please follow our [Code of Conduct](https://github.com/exotjs/express/blob/main/CODE_OF_CONDUCT.md).

## License

MIT