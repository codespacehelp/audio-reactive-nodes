import { describe, it, expect } from 'vitest';
import { computeLiveNodes } from './liveness';

describe('computeLiveNodes', () => {
  it('finds all nodes reachable from out in a linear chain', () => {
    // a → b → c (out)
    const reverse: Record<string, string[]> = {
      a: [],
      b: ['a'],
      c: ['b'],
    };
    const live = computeLiveNodes('c', reverse);
    expect(live).toEqual(new Set(['a', 'b', 'c']));
  });

  it('excludes disconnected nodes', () => {
    // a → b → c (out), x is disconnected
    const reverse: Record<string, string[]> = {
      a: [],
      b: ['a'],
      c: ['b'],
      x: [],
    };
    const live = computeLiveNodes('c', reverse);
    expect(live).toEqual(new Set(['a', 'b', 'c']));
    expect(live.has('x')).toBe(false);
  });

  it('handles diamond graph', () => {
    // a → b, a → c, b → d (out), c → d (out)
    const reverse: Record<string, string[]> = {
      a: [],
      b: ['a'],
      c: ['a'],
      d: ['b', 'c'],
    };
    const live = computeLiveNodes('d', reverse);
    expect(live).toEqual(new Set(['a', 'b', 'c', 'd']));
  });

  it('returns empty set if out node does not exist', () => {
    const reverse: Record<string, string[]> = { a: [] };
    const live = computeLiveNodes('missing', reverse);
    expect(live.size).toBe(0);
  });

  it('returns just the out node if it has no inputs', () => {
    const reverse: Record<string, string[]> = { out: [] };
    const live = computeLiveNodes('out', reverse);
    expect(live).toEqual(new Set(['out']));
  });
});
