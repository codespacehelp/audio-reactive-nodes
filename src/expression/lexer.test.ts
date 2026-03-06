import { describe, it, expect } from 'vitest';
import { tokenize } from './lexer';

describe('tokenize', () => {
  it('tokenizes integer', () => {
    const tokens = tokenize('42');
    expect(tokens).toEqual([
      { type: 'number', value: '42', pos: 0 },
      { type: 'eof', value: '', pos: 2 },
    ]);
  });

  it('tokenizes float', () => {
    const tokens = tokenize('3.14');
    expect(tokens).toEqual([
      { type: 'number', value: '3.14', pos: 0 },
      { type: 'eof', value: '', pos: 4 },
    ]);
  });

  it('tokenizes operators and parens', () => {
    const tokens = tokenize('1 + 2 * (3 - 4) / 5');
    const types = tokens.map((t) => t.type);
    expect(types).toEqual([
      'number', 'plus', 'number', 'star', 'lparen',
      'number', 'minus', 'number', 'rparen', 'slash',
      'number', 'eof',
    ]);
  });

  it('tokenizes cross-node ref @node:channel', () => {
    const tokens = tokenize('@channel_map1:low');
    expect(tokens[0]).toEqual({ type: 'ref', value: '@channel_map1:low', pos: 0 });
  });

  it('tokenizes same-node ref @:param', () => {
    const tokens = tokenize('@:x');
    expect(tokens[0]).toEqual({ type: 'ref', value: '@:x', pos: 0 });
  });

  it('tokenizes function name', () => {
    const tokens = tokenize('clamp(x, 0, 1)');
    expect(tokens[0]).toEqual({ type: 'ident', value: 'clamp', pos: 0 });
    expect(tokens[1].type).toBe('lparen');
  });

  it('tokenizes complex expression', () => {
    const tokens = tokenize('@channel_map1:low * 1.5 + 0.8');
    const types = tokens.map((t) => t.type);
    expect(types).toEqual(['ref', 'star', 'number', 'plus', 'number', 'eof']);
  });

  it('tokenizes comma', () => {
    const tokens = tokenize('min(1, 2)');
    const types = tokens.map((t) => t.type);
    expect(types).toEqual(['ident', 'lparen', 'number', 'comma', 'number', 'rparen', 'eof']);
  });

  it('tokenizes unary minus', () => {
    const tokens = tokenize('-5');
    expect(tokens[0]).toEqual({ type: 'minus', value: '-', pos: 0 });
    expect(tokens[1]).toEqual({ type: 'number', value: '5', pos: 1 });
  });

  it('throws on invalid character', () => {
    expect(() => tokenize('1 & 2')).toThrow(/Unexpected character '&'/);
  });

  it('throws on incomplete ref', () => {
    expect(() => tokenize('@')).toThrow();
  });
});
