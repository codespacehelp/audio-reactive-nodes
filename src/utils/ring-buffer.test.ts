import { describe, it, expect } from 'vitest';
import { RingBuffer } from './ring-buffer';

describe('RingBuffer', () => {
  it('starts empty with all zeros', () => {
    const rb = new RingBuffer(4);
    expect(rb.toArray()).toEqual([0, 0, 0, 0]);
    expect(rb.head).toBe(0);
  });

  it('pushes values in order', () => {
    const rb = new RingBuffer(4);
    rb.push(1);
    rb.push(2);
    rb.push(3);
    // Read oldest → newest
    expect(rb.toArray()).toEqual([0, 1, 2, 3]);
  });

  it('wraps around when full', () => {
    const rb = new RingBuffer(3);
    rb.push(1);
    rb.push(2);
    rb.push(3);
    rb.push(4); // Overwrites oldest (1)
    expect(rb.toArray()).toEqual([2, 3, 4]);
  });

  it('reports correct capacity', () => {
    const rb = new RingBuffer(10);
    expect(rb.capacity).toBe(10);
  });

  it('peek returns latest value', () => {
    const rb = new RingBuffer(4);
    rb.push(10);
    rb.push(20);
    expect(rb.peek()).toBe(20);
  });

  it('peek returns 0 when empty', () => {
    const rb = new RingBuffer(4);
    expect(rb.peek()).toBe(0);
  });
});
