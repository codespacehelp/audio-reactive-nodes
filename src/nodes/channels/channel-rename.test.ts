import { describe, it, expect } from 'vitest';
import { channelRenameDef } from './channel-rename';
import type { EvaluateContext } from '../../types/node-def';
import type { ChannelSet } from '../../types/runtime';

function makeCtx(input: ChannelSet | null, params: Record<string, unknown>): EvaluateContext {
  return {
    inputs: { in: input },
    params,
    time: 0,
    dt: 0.016,
    nodeName: 'test',
  };
}

describe('channel_rename', () => {
  it('renames a single channel', () => {
    const input: ChannelSet = { values: { band0: 1, band1: 2, band2: 3 } };
    const ctx = makeCtx(input, { from_1: 'band0', to_1: 'low', from_2: '', to_2: '', from_3: '', to_3: '', from_4: '', to_4: '', from_5: '', to_5: '' });
    const result = channelRenameDef.evaluate(ctx);
    const channels = result.out as ChannelSet;
    expect(channels.values).toEqual({ low: 1, band1: 2, band2: 3 });
  });

  it('renames multiple channels', () => {
    const input: ChannelSet = { values: { band0: 1, band1: 2, band2: 3 } };
    const ctx = makeCtx(input, { from_1: 'band0', to_1: 'low', from_2: 'band1', to_2: 'mid', from_3: 'band2', to_3: 'high', from_4: '', to_4: '', from_5: '', to_5: '' });
    const result = channelRenameDef.evaluate(ctx);
    const channels = result.out as ChannelSet;
    expect(channels.values).toEqual({ low: 1, mid: 2, high: 3 });
  });

  it('ignores non-matching rules', () => {
    const input: ChannelSet = { values: { x: 10 } };
    const ctx = makeCtx(input, { from_1: 'nonexistent', to_1: 'foo', from_2: '', to_2: '', from_3: '', to_3: '', from_4: '', to_4: '', from_5: '', to_5: '' });
    const result = channelRenameDef.evaluate(ctx);
    const channels = result.out as ChannelSet;
    expect(channels.values).toEqual({ x: 10 });
  });

  it('passes through with no input', () => {
    const ctx = makeCtx(null, { from_1: '', to_1: '', from_2: '', to_2: '', from_3: '', to_3: '', from_4: '', to_4: '', from_5: '', to_5: '' });
    const result = channelRenameDef.evaluate(ctx);
    const channels = result.out as ChannelSet;
    expect(channels.values).toEqual({});
  });
});
