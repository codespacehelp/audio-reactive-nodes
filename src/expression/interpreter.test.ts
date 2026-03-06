import { describe, it, expect } from 'vitest';
import { evaluate } from './interpreter';
import { parse } from './parser';

function eval_(source: string, refs: Record<string, number> = {}): number {
  const ast = parse(source);
  return evaluate(ast, (node, name) => {
    const key = node ? `${node}:${name}` : name;
    if (key in refs) return refs[key];
    throw new Error(`Unknown ref: ${key}`);
  });
}

describe('evaluate', () => {
  it('evaluates number literal', () => {
    expect(eval_('42')).toBe(42);
  });

  it('evaluates addition', () => {
    expect(eval_('1 + 2')).toBe(3);
  });

  it('evaluates subtraction', () => {
    expect(eval_('10 - 3')).toBe(7);
  });

  it('evaluates multiplication', () => {
    expect(eval_('4 * 5')).toBe(20);
  });

  it('evaluates division', () => {
    expect(eval_('10 / 4')).toBe(2.5);
  });

  it('respects operator precedence', () => {
    expect(eval_('2 + 3 * 4')).toBe(14);
  });

  it('respects parentheses', () => {
    expect(eval_('(2 + 3) * 4')).toBe(20);
  });

  it('evaluates unary minus', () => {
    expect(eval_('-5')).toBe(-5);
  });

  it('evaluates double unary minus', () => {
    expect(eval_('--5')).toBe(5);
  });

  it('resolves cross-node ref', () => {
    expect(eval_('@channel_map1:low', { 'channel_map1:low': 0.75 })).toBe(0.75);
  });

  it('resolves same-node ref', () => {
    expect(eval_('@:x', { x: 3 })).toBe(3);
  });

  it('evaluates complex expression with refs', () => {
    expect(eval_('@channel_map1:low * 1.5 + 0.8', { 'channel_map1:low': 1 })).toBe(2.3);
  });

  // Built-in functions
  it('evaluates clamp', () => {
    expect(eval_('clamp(5, 0, 3)')).toBe(3);
    expect(eval_('clamp(-1, 0, 3)')).toBe(0);
    expect(eval_('clamp(2, 0, 3)')).toBe(2);
  });

  it('evaluates min', () => {
    expect(eval_('min(3, 7)')).toBe(3);
  });

  it('evaluates max', () => {
    expect(eval_('max(3, 7)')).toBe(7);
  });

  it('evaluates floor', () => {
    expect(eval_('floor(3.7)')).toBe(3);
  });

  it('evaluates ceil', () => {
    expect(eval_('ceil(3.2)')).toBe(4);
  });

  it('evaluates round', () => {
    expect(eval_('round(3.5)')).toBe(4);
    expect(eval_('round(3.4)')).toBe(3);
  });

  it('evaluates map (unclamped)', () => {
    // map(0.5, 0, 1, 10, 20) → 15
    expect(eval_('map(0.5, 0, 1, 10, 20)')).toBe(15);
    // map beyond range: map(2, 0, 1, 10, 20) → 30 (unclamped)
    expect(eval_('map(2, 0, 1, 10, 20)')).toBe(30);
  });

  it('throws on unknown function', () => {
    expect(() => eval_('foo(1)')).toThrow(/Unknown function/);
  });

  it('throws on wrong arg count', () => {
    expect(() => eval_('clamp(1, 2)')).toThrow(/expects 3/);
  });

  it('returns NaN on division by zero', () => {
    expect(eval_('1 / 0')).toBe(Infinity);
  });
});
