import { describe, it, expect } from 'vitest';
import { buildAdjacency, topologicalSort } from './graph-model';
import type { ConnectionData } from '../types/project';

function conn(from: string, to: string, id?: string): ConnectionData {
  return { id: id ?? `${from}-${to}`, fromNode: from, fromPort: 'out', toNode: to, toPort: 'in' };
}

describe('buildAdjacency', () => {
  it('builds forward and reverse adjacency maps', () => {
    const connections = [conn('a', 'b'), conn('b', 'c')];
    const nodeIds = ['a', 'b', 'c'];
    const { forward, reverse } = buildAdjacency(nodeIds, connections);

    expect(forward.a).toEqual(['b']);
    expect(forward.b).toEqual(['c']);
    expect(forward.c).toEqual([]);
    expect(reverse.c).toEqual(['b']);
    expect(reverse.b).toEqual(['a']);
    expect(reverse.a).toEqual([]);
  });
});

describe('topologicalSort', () => {
  it('sorts a linear chain', () => {
    const connections = [conn('a', 'b'), conn('b', 'c')];
    const nodeIds = ['c', 'a', 'b']; // shuffled
    const result = topologicalSort(nodeIds, connections);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const order = result.value;
      expect(order.indexOf('a')).toBeLessThan(order.indexOf('b'));
      expect(order.indexOf('b')).toBeLessThan(order.indexOf('c'));
    }
  });

  it('sorts a diamond graph', () => {
    // a → b, a → c, b → d, c → d
    const connections = [conn('a', 'b'), conn('a', 'c'), conn('b', 'd'), conn('c', 'd')];
    const nodeIds = ['d', 'c', 'b', 'a'];
    const result = topologicalSort(nodeIds, connections);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const order = result.value;
      expect(order.indexOf('a')).toBeLessThan(order.indexOf('b'));
      expect(order.indexOf('a')).toBeLessThan(order.indexOf('c'));
      expect(order.indexOf('b')).toBeLessThan(order.indexOf('d'));
      expect(order.indexOf('c')).toBeLessThan(order.indexOf('d'));
    }
  });

  it('detects a simple cycle', () => {
    const connections = [conn('a', 'b'), conn('b', 'a')];
    const nodeIds = ['a', 'b'];
    const result = topologicalSort(nodeIds, connections);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/cycle/i);
  });

  it('detects a cycle in a larger graph', () => {
    const connections = [conn('a', 'b'), conn('b', 'c'), conn('c', 'a')];
    const nodeIds = ['a', 'b', 'c'];
    const result = topologicalSort(nodeIds, connections);
    expect(result.ok).toBe(false);
  });

  it('handles disconnected nodes', () => {
    const connections = [conn('a', 'b')];
    const nodeIds = ['a', 'b', 'x']; // x is disconnected
    const result = topologicalSort(nodeIds, connections);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(3);
      expect(result.value.indexOf('a')).toBeLessThan(result.value.indexOf('b'));
    }
  });
});
