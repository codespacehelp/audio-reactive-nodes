import { describe, it, expect } from 'vitest';
import { propagateDirty } from './dirty';

describe('propagateDirty', () => {
  it('marks downstream nodes dirty', () => {
    // a → b → c
    const forward: Record<string, string[]> = {
      a: ['b'],
      b: ['c'],
      c: [],
    };
    const dirty: Record<string, boolean> = { a: false, b: false, c: false };
    propagateDirty('a', forward, dirty);

    expect(dirty.a).toBe(true);
    expect(dirty.b).toBe(true);
    expect(dirty.c).toBe(true);
  });

  it('propagates from a mid-chain node', () => {
    const forward: Record<string, string[]> = {
      a: ['b'],
      b: ['c'],
      c: [],
    };
    const dirty: Record<string, boolean> = { a: false, b: false, c: false };
    propagateDirty('b', forward, dirty);

    expect(dirty.a).toBe(false);
    expect(dirty.b).toBe(true);
    expect(dirty.c).toBe(true);
  });

  it('does not re-propagate already-dirty nodes', () => {
    // diamond: a → b, a → c, b → d, c → d
    const forward: Record<string, string[]> = {
      a: ['b', 'c'],
      b: ['d'],
      c: ['d'],
      d: [],
    };
    const dirty: Record<string, boolean> = { a: false, b: false, c: false, d: false };
    propagateDirty('a', forward, dirty);

    expect(dirty.d).toBe(true);
    // All reachable nodes should be dirty
    expect(Object.values(dirty).every(Boolean)).toBe(true);
  });

  it('handles single node with no downstream', () => {
    const forward: Record<string, string[]> = { x: [] };
    const dirty: Record<string, boolean> = { x: false };
    propagateDirty('x', forward, dirty);

    expect(dirty.x).toBe(true);
  });
});
