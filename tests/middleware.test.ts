import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { errorHandler, middleware } from '../lib/index.js';
import { Inspector } from '../lib/inspector.js';
import { MemoryStore } from '../lib/store.js';

class MockRequest extends EventEmitter {
  method: string = 'GET';
  path: string = '/';
}

class MockResponse extends EventEmitter {
  headers: Record<string, string> = {};
  statusCode: number = 200;
  end() {
    this.emit('finish');
  }
  header(name: string, value: string) {
    this.headers[name] = value;
  }
}

describe('express', () => {
  let inspector: Inspector;
  let store: MemoryStore;
  let req: MockRequest;
  let res: MockResponse;

  beforeEach(() => {
    store = new MemoryStore();
    inspector = new Inspector({
      store,
    });
    req = new MockRequest();
    res = new MockResponse();
  });

  afterEach(() => {
    if (inspector) {
      inspector.destroy();
    }
  });

  describe('middleware()', () => {
    it('should return a function', () => {
      const result = middleware({
        inspector,
      });
      expect(typeof result).toEqual('function');
    });

    it('should throw if the inspector is not provided', () => {
      expect(() => {
        middleware({
          inspector: null as any,
        });
      }).toThrow();
    });

    it('should call the next function', () => {
      const fn = middleware({
        inspector,
      });
      const next = vi.fn();
      fn(req as any, res as any, next);
      expect(next).toHaveBeenCalled();
    });

    it('should create a trace in the store', async () => {
      const fn = middleware({
        inspector,
      });
      fn(req as any, res as any, () => res.end());
      await new Promise((resolve) => {
        setTimeout(() => {
          const value: string = store.lists.get('traces')?.[0]?.value;
          expect(value).toBeDefined();
          expect(value.includes('"name":"request"'));
          expect(value.includes('"method":"GET"'));
          expect(value.includes('"path":"/"'));
          resolve(void 0);
        }, 100);
      });
    });

    it('should create a response in the store', async () => {
      const fn = middleware({
        inspector,
      });
      fn(req as any, res as any, () => res.end());
      await new Promise((resolve) => {
        setTimeout(() => {
          const latency = store.sets.get('response:latency');
          const status = store.sets.get('response:2xx');
          expect(latency?.size).toEqual(1);
          expect(status?.size).toEqual(1);
          resolve(void 0);
        }, 100);
      });
    });

    it('should set x-trace-id response header', () => {
      const fn = middleware({
        inspector,
      });
      fn(req as any, res as any, () => void 0);
      expect(res.headers['X-Trace-Id']).toBeDefined();
    });

    it('should set x-custom-trace-id response header', () => {
      const fn = middleware({
        inspector,
        traceIdHeader: 'x-custom-trace-id',
      });
      fn(req as any, res as any, () => void 0);
      expect(res.headers['x-custom-trace-id']).toBeDefined();
    });
  });

  describe('errorHandler()', () => {
    it('should return a function', () => {
      const result = errorHandler({
        inspector,
      });
      expect(typeof result).toEqual('function');
    });

    it('should throw if the inspector is not provided', () => {
      expect(() => {
        errorHandler({
          inspector: null as any,
        });
      }).toThrow();
    });

    it('should call the next function', () => {
      const fn = errorHandler({
        inspector,
      });
      const next = vi.fn();
      fn(new Error(''), req as any, res as any, next);
      expect(next).toHaveBeenCalled();
    });

    it('should create an error in the store', async () => {
      const fn = errorHandler({
        inspector,
      });
      fn(new Error('test'), req as any, res as any, () => res.end());
      await new Promise((resolve) => {
        setTimeout(() => {
          const value: string = store.lists.get('errors')?.[0]?.value;
          expect(value).toBeDefined();
          expect(value.includes('"message":"test"'));
          expect(value.includes('"method":"GET"'));
          expect(value.includes('"path":"/"'));
          resolve(void 0);
        }, 100);
      });
    });
  });
});
