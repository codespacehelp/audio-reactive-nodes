import { describe, it, expect } from 'vitest';
import { channelMapDef } from './channel-map';
import type { EvaluateContext } from '../../types/node-def';
import type { ChannelSet } from '../../types/runtime';

function makeCtx(input: ChannelSet | null, params: Record<string, unknown>): EvaluateContext {
  return {
    inputs: { in: input },
    params: { in_min: 0, in_max: 255, out_min: 0, out_max: 1, clip_mode: 'none', ...params },
    time: 0,
    dt: 0.016,
    nodeName: 'test',
  };
}

describe('channel_map', () => {
  it('maps 0-255 to 0-1', () => {
    const input: ChannelSet = { values: { low: 127.5 } };
    const ctx = makeCtx(input, {});
    const result = channelMapDef.evaluate(ctx);
    const channels = result.out as ChannelSet;
    expect(channels.values.low).toBeCloseTo(0.5);
  });

  it('maps to custom range', () => {
    const input: ChannelSet = { values: { low: 0.5 } };
    const ctx = makeCtx(input, { in_min: 0, in_max: 1, out_min: 10, out_max: 20 });
    const result = channelMapDef.evaluate(ctx);
    const channels = result.out as ChannelSet;
    expect(channels.values.low).toBeCloseTo(15);
  });

  it('allows values beyond range with clip_mode none', () => {
    const input: ChannelSet = { values: { low: 300 } };
    const ctx = makeCtx(input, { clip_mode: 'none' });
    const result = channelMapDef.evaluate(ctx);
    const channels = result.out as ChannelSet;
    expect(channels.values.low).toBeGreaterThan(1);
  });

  it('clamps with clip_mode clamp', () => {
    const input: ChannelSet = { values: { low: 300 } };
    const ctx = makeCtx(input, { clip_mode: 'clamp' });
    const result = channelMapDef.evaluate(ctx);
    const channels = result.out as ChannelSet;
    expect(channels.values.low).toBe(1);
  });

  it('maps multiple channels', () => {
    const input: ChannelSet = { values: { low: 0, mid: 127.5, high: 255 } };
    const ctx = makeCtx(input, {});
    const result = channelMapDef.evaluate(ctx);
    const channels = result.out as ChannelSet;
    expect(channels.values.low).toBeCloseTo(0);
    expect(channels.values.mid).toBeCloseTo(0.5);
    expect(channels.values.high).toBeCloseTo(1);
  });

  it('returns empty with no input', () => {
    const ctx = makeCtx(null, {});
    const result = channelMapDef.evaluate(ctx);
    const channels = result.out as ChannelSet;
    expect(channels.values).toEqual({});
  });
});
