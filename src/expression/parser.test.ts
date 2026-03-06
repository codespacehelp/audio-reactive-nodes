import { describe, it, expect } from 'vitest';
import { parse } from './parser';
import type { ASTNode } from './types';

describe('parse', () => {
  it('parses number literal', () => {
    expect(parse('42')).toEqual({ kind: 'number', value: 42 });
  });

  it('parses float literal', () => {
    expect(parse('3.14')).toEqual({ kind: 'number', value: 3.14 });
  });

  it('parses addition', () => {
    const ast = parse('1 + 2');
    expect(ast).toEqual({
      kind: 'binary',
      op: '+',
      left: { kind: 'number', value: 1 },
      right: { kind: 'number', value: 2 },
    });
  });

  it('respects operator precedence (* before +)', () => {
    const ast = parse('1 + 2 * 3') as ASTNode & { kind: 'binary' };
    expect(ast.kind).toBe('binary');
    expect(ast.op).toBe('+');
    expect(ast.left).toEqual({ kind: 'number', value: 1 });
    // Right side should be 2 * 3
    expect(ast.right).toEqual({
      kind: 'binary',
      op: '*',
      left: { kind: 'number', value: 2 },
      right: { kind: 'number', value: 3 },
    });
  });

  it('respects parentheses overriding precedence', () => {
    const ast = parse('(1 + 2) * 3') as ASTNode & { kind: 'binary' };
    expect(ast.kind).toBe('binary');
    expect(ast.op).toBe('*');
    // Left side should be 1 + 2
    expect(ast.left).toEqual({
      kind: 'binary',
      op: '+',
      left: { kind: 'number', value: 1 },
      right: { kind: 'number', value: 2 },
    });
    expect(ast.right).toEqual({ kind: 'number', value: 3 });
  });

  it('parses unary minus', () => {
    expect(parse('-5')).toEqual({
      kind: 'unary',
      op: '-',
      operand: { kind: 'number', value: 5 },
    });
  });

  it('parses cross-node ref', () => {
    expect(parse('@channel_map1:low')).toEqual({
      kind: 'ref',
      node: 'channel_map1',
      name: 'low',
    });
  });

  it('parses same-node ref', () => {
    expect(parse('@:x')).toEqual({
      kind: 'ref',
      node: '',
      name: 'x',
    });
  });

  it('parses function call with single arg', () => {
    const ast = parse('floor(3.7)');
    expect(ast).toEqual({
      kind: 'call',
      name: 'floor',
      args: [{ kind: 'number', value: 3.7 }],
    });
  });

  it('parses function call with multiple args', () => {
    const ast = parse('clamp(x, 0, 1)');
    expect(ast).toEqual({
      kind: 'call',
      name: 'clamp',
      args: [
        { kind: 'ref', node: '', name: 'x' },
        { kind: 'number', value: 0 },
        { kind: 'number', value: 1 },
      ],
    });
  });

  it('parses complex expression', () => {
    const ast = parse('@channel_map1:low * 1.5 + 0.8');
    expect(ast.kind).toBe('binary');
  });

  it('throws on unexpected token', () => {
    expect(() => parse('1 +')).toThrow();
  });

  it('throws on unclosed paren', () => {
    expect(() => parse('(1 + 2')).toThrow();
  });
});
