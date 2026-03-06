import { describe, it, expect } from 'vitest';
import { channelLagDef } from './channel-lag';
import type { EvaluateContext } from '../../types/node-def';
import type { ChannelSet } from '../../types/runtime';

function makeCtx(input: ChannelSet | null, params: Record<string, unknown>, dt = 0.016): EvaluateContext {
  return {
    inputs: { in: input },
    params: { attack_ms: 30, release_ms: 220, gain: 1, ...params },
    time: 0,
    dt,
    nodeName: 'test',
  };
}

describe('channel_lag', () => {
  it('passes through on first frame (no previous state)', () => {
    const input: ChannelSet = { values: { low: 0.5 } };
    const ctx = makeCtx(input, {});
    const result = channelLagDef.evaluate(ctx);
    const channels = result.out as ChannelSet;
    // First frame should move towards input from 0
    expect(channels.values.low).toBeGreaterThan(0);
    expect(channels.values.low).toBeLessThanOrEqual(0.5);
  });

  it('applies gain', () => {
    const input: ChannelSet = { values: { low: 1 } };
    const ctx = makeCtx(input, { gain: 2 });
    const result = channelLagDef.evaluate(ctx);
    const channels = result.out as ChannelSet;
    // With gain=2, target is 2, first frame from 0 approaches 2
    expect(channels.values.low).toBeGreaterThan(0);
  });

  it('returns empty with no input', () => {
    const ctx = makeCtx(null, {});
    const result = channelLagDef.evaluate(ctx);
    const channels = result.out as ChannelSet;
    expect(channels.values).toEqual({});
  });

  it('smooths towards target over multiple frames', () => {
    const input1: ChannelSet = { values: { low: 1 } };
    // Frame 1: jump up
    channelLagDef.evaluate(makeCtx(input1, {}));
    // Frame 2: hold
    const result2 = channelLagDef.evaluate(makeCtx(input1, {}));
    const v2 = (result2.out as ChannelSet).values.low;
    // Frame 3: drop
    const input3: ChannelSet = { values: { low: 0 } };
    const result3 = channelLagDef.evaluate(makeCtx(input3, {}));
    const v3 = (result3.out as ChannelSet).values.low;
    // Release is slower than attack, so value should still be > 0
    expect(v3).toBeGreaterThan(0);
    expect(v3).toBeLessThan(v2);
  });
});
