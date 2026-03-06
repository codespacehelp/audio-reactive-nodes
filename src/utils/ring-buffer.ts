/**
 * Fixed-capacity ring buffer backed by Float32Array.
 * Used for preview history (e.g., 3 seconds of channel values at 60fps).
 */
export class RingBuffer {
  readonly capacity: number;
  readonly data: Float32Array;
  private _head = 0;
  private _count = 0;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.data = new Float32Array(capacity);
  }

  get head(): number {
    return this._head;
  }

  /** Push a value, overwriting the oldest if full. */
  push(value: number): void {
    this.data[this._head] = value;
    this._head = (this._head + 1) % this.capacity;
    if (this._count < this.capacity) this._count++;
  }

  /** Peek at the most recently pushed value. */
  peek(): number {
    if (this._count === 0) return 0;
    const idx = (this._head - 1 + this.capacity) % this.capacity;
    return this.data[idx];
  }

  /**
   * Return values in chronological order (oldest first).
   * Always returns `capacity` values (unfilled slots are 0).
   */
  toArray(): number[] {
    const result: number[] = [];
    for (let i = 0; i < this.capacity; i++) {
      const idx = (this._head + i) % this.capacity;
      result.push(this.data[idx]);
    }
    return result;
  }
}
