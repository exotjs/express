import { describe, expect, it } from 'vitest';
import { middleware } from '../lib/index.js';
import { Inspector } from '../lib/inspector.js';
import { MemoryStore } from '../lib/store.js';

describe('middleware', () => {
  const inspector = new Inspector({
    store: new MemoryStore(),
  });

  it('should return a function', () => {
    const result = middleware({
      inspector,
    });
    expect(typeof result).toEqual('function');
  });
});