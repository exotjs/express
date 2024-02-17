import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AddressInfo, WebSocket, WebSocketServer } from 'ws';
import { Inspector } from '../lib/inspector.js';
import { MemoryStore } from '../lib/store.js';
import { websocketServer } from '../lib/index.js';

describe('WebSocket Server', () => {
  const inspector = new Inspector({
    store: new MemoryStore(),
  });

  it('should throw if the inspector is not provided', async () => {
    expect(() =>
      websocketServer({
        inspector: null as any,
        ws: {
          port: 0,
        },
      })
    ).toThrow();
  });

  it('should start a server', async () => {
    const server = await websocketServer({
      inspector,
      ws: {
        port: 0,
      },
    });
    expect(server).instanceOf(WebSocketServer);
  });

  describe('channel', () => {
    let authorize = vi.fn();
    let server: WebSocketServer;
    let address: string;

    beforeAll(async () => {
      server = await websocketServer({
        authorize,
        inspector,
        path: '/_inspector_test',
        ws: {
          port: 0,
        },
      });
      address = `http://127.0.0.1:${(server.address() as AddressInfo)?.port}/_inspector_test`;
    });

    afterAll(() => {
      if (server) {
        server.close();
      }
    });

    it('should call authorize', async () => {
      await new Promise((resolve) => {
        const ws = new WebSocket(address);
        ws.on('open', () => {
          expect(authorize).toHaveBeenCalled();
          resolve(void 0);
        });
      });
    });

    it('should close the connection if authorize throws', async () => {
      authorize.mockImplementation(() => {
        throw new Error('unauthorized');
      });
      await new Promise((resolve) => {
        const ws = new WebSocket(address);
        ws.on('close', () => {
          expect(authorize).toHaveBeenCalled();
          resolve(void 0);
        });
      });
      authorize.mockReset();
    });

    it('should close the connection if path does not match', async () => {
      await new Promise((resolve) => {
        const ws = new WebSocket(
          address.replace('/_inspector_test', '/wrong_path')
        );
        ws.on('close', () => {
          resolve(void 0);
        });
      });
    });

    it('should call inspector.createSession() on connection', async () => {
      await new Promise((resolve) => {
        const spy = vi.spyOn(inspector, 'createSession');
        const ws = new WebSocket(address);
        ws.on('open', () => {
          expect(spy).toHaveBeenCalled();
          resolve(void 0);
        });
      });
    });

    it('should received a response to hello', async () => {
      await new Promise((resolve) => {
        const ws = new WebSocket(address);
        ws.on('open', () => {
          ws.on('message', (message) => {
            const json = JSON.parse(String(message));
            expect(json.id).toEqual(1);
            expect(json.type).toEqual('ok');
            expect(json.data).toBeDefined();
            resolve(void 0);
          });
          ws.send(
            JSON.stringify({
              id: 1,
              type: 'hello',
            })
          );
        });
      });
    });
  });
});
