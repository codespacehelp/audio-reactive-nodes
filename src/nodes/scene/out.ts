import type { NodeDef } from '../../types/node-def';

export const outDef: NodeDef = {
  type: 'out',
  category: 'scene',
  inputs: [{ name: 'scene', type: 'scene' }],
  outputs: [],
  params: [],
  evaluate: (ctx) => {
    // Pass through the scene — the out node is the terminal sink
    return { scene: ctx.inputs.scene };
  },
};
