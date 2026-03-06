import type { NodeDef } from '../../types/node-def';
import type { ChannelSet } from '../../types/runtime';

export const channelRenameDef: NodeDef = {
  type: 'channel_rename',
  category: 'channels',
  inputs: [{ name: 'in', type: 'channel_set' }],
  outputs: [{ name: 'out', type: 'channel_set' }],
  params: [
    { name: 'from_1', type: 'string', default: '' },
    { name: 'to_1', type: 'string', default: '' },
    { name: 'from_2', type: 'string', default: '' },
    { name: 'to_2', type: 'string', default: '' },
    { name: 'from_3', type: 'string', default: '' },
    { name: 'to_3', type: 'string', default: '' },
    { name: 'from_4', type: 'string', default: '' },
    { name: 'to_4', type: 'string', default: '' },
    { name: 'from_5', type: 'string', default: '' },
    { name: 'to_5', type: 'string', default: '' },
  ],
  evaluate: (ctx) => {
    const input = ctx.inputs.in as ChannelSet | null;
    const values: Record<string, number> = input ? { ...input.values } : {};

    // Build rename map
    for (let i = 1; i <= 5; i++) {
      const from = ctx.params[`from_${i}`] as string;
      const to = ctx.params[`to_${i}`] as string;
      if (from && to && from in values) {
        const val = values[from];
        delete values[from];
        values[to] = val;
      }
    }

    return { out: { values } as ChannelSet };
  },
};
