import { describe, it, expect } from 'vitest';
import { extractDeps } from './deps';
import { parse } from './parser';

describe('extractDeps', () => {
  it('returns empty for number literal', () => {
    expect(extractDeps(parse('42'))).toEqual([]);
  });

  it('extracts cross-node ref', () => {
    expect(extractDeps(parse('@channel_map1:low'))).toEqual([
      { node: 'channel_map1', name: 'low' },
    ]);
  });

  it('extracts same-node ref', () => {
    expect(extractDeps(parse('@:x'))).toEqual([
      { node: '', name: 'x' },
    ]);
  });

  it('extracts multiple refs from complex expression', () => {
    const deps = extractDeps(parse('@channel_map1:low * 1.5 + @:x'));
    expect(deps).toEqual([
      { node: 'channel_map1', name: 'low' },
      { node: '', name: 'x' },
    ]);
  });

  it('deduplicates refs', () => {
    const deps = extractDeps(parse('@a:b + @a:b'));
    expect(deps).toEqual([{ node: 'a', name: 'b' }]);
  });

  it('extracts refs inside function args', () => {
    const deps = extractDeps(parse('clamp(@:val, 0, 1)'));
    expect(deps).toEqual([{ node: '', name: 'val' }]);
  });
});
