import { describe, it, expect, vi } from 'vitest';
import { evaluateGraph } from './evaluator';
import type { NodeDef, EvaluateContext } from '../types/node-def';
import type { NodeData, ConnectionData } from '../types/project';
import type { RuntimeState, NodeRuntimeState } from '../types/runtime';
import { parse } from '../expression/parser';
import { extractDeps } from '../expression/deps';

/** Helper to create a minimal NodeData */
function makeNode(id: string, type: string, params: Record<string, any> = {}): NodeData {
  const p: Record<string, any> = {};
  for (const [k, v] of Object.entries(params)) {
    p[k] = { mode: 'literal', value: v };
  }
  return { id, name: id, type, position: { x: 0, y: 0 }, params: p };
}

function makeRuntimeNode(dirty = true): NodeRuntimeState {
  return { outputs: {}, dirty, error: null, lastValidOutputs: null };
}

describe('evaluateGraph', () => {
  it('evaluates a linear chain A→B', () => {
    const nodeA = makeNode('a', 'source', { val: 10 });
    const nodeB = makeNode('b', 'doubler');
    const nodes = [nodeA, nodeB];
    const connections: ConnectionData[] = [
      { id: 'c1', fromNode: 'a', fromPort: 'out', toNode: 'b', toPort: 'in' },
    ];

    const defs: Record<string, NodeDef> = {
      source: {
        type: 'source', category: 'geometry',
        inputs: [], outputs: [{ name: 'out', type: 'geometry' }],
        params: [{ name: 'val', type: 'float', default: 0 }],
        evaluate: (ctx) => ({ out: ctx.params.val }),
      },
      doubler: {
        type: 'doubler', category: 'geometry',
        inputs: [{ name: 'in', type: 'geometry' }], outputs: [{ name: 'out', type: 'geometry' }],
        params: [],
        evaluate: (ctx) => ({ out: (ctx.inputs.in as number) * 2 }),
      },
    };

    const runtime: RuntimeState = {
      nodes: { a: makeRuntimeNode(), b: makeRuntimeNode() },
      liveOrder: ['a', 'b'],
      hasFrameDriven: false,
      expressions: {},
    };

    const result = evaluateGraph(nodes, connections, defs, runtime, 0, 0.016);

    expect(result.nodes.a.outputs).toEqual({ out: 10 });
    expect(result.nodes.b.outputs).toEqual({ out: 20 });
    expect(result.nodes.a.dirty).toBe(false);
    expect(result.nodes.b.dirty).toBe(false);
  });

  it('skips clean nodes', () => {
    const nodeA = makeNode('a', 'source', { val: 5 });
    const evaluateFn = vi.fn((ctx: EvaluateContext) => ({ out: ctx.params.val }));

    const defs: Record<string, NodeDef> = {
      source: {
        type: 'source', category: 'geometry',
        inputs: [], outputs: [{ name: 'out', type: 'geometry' }],
        params: [{ name: 'val', type: 'float', default: 0 }],
        evaluate: evaluateFn,
      },
    };

    const runtime: RuntimeState = {
      nodes: { a: { outputs: { out: 5 }, dirty: false, error: null, lastValidOutputs: { out: 5 } } },
      liveOrder: ['a'],
      hasFrameDriven: false,
      expressions: {},
    };

    const result = evaluateGraph([nodeA], [], defs, runtime, 0, 0.016);

    expect(evaluateFn).not.toHaveBeenCalled();
    expect(result.nodes.a.outputs).toEqual({ out: 5 });
  });

  it('always evaluates needsFrame nodes even when clean', () => {
    const nodeA = makeNode('a', 'timer');
    const evaluateFn = vi.fn((ctx: EvaluateContext) => ({ out: ctx.time }));

    const defs: Record<string, NodeDef> = {
      timer: {
        type: 'timer', category: 'audio',
        inputs: [], outputs: [{ name: 'out', type: 'channel_set' }],
        params: [],
        needsFrame: true,
        evaluate: evaluateFn,
      },
    };

    const runtime: RuntimeState = {
      nodes: { a: { outputs: { out: 0 }, dirty: false, error: null, lastValidOutputs: { out: 0 } } },
      liveOrder: ['a'],
      hasFrameDriven: true,
      expressions: {},
    };

    const result = evaluateGraph([nodeA], [], defs, runtime, 1.5, 0.016);

    expect(evaluateFn).toHaveBeenCalled();
    expect(result.nodes.a.outputs).toEqual({ out: 1.5 });
  });

  it('falls back to lastValidOutputs on error', () => {
    const nodeA = makeNode('a', 'failer');

    const defs: Record<string, NodeDef> = {
      failer: {
        type: 'failer', category: 'geometry',
        inputs: [], outputs: [{ name: 'out', type: 'geometry' }],
        params: [],
        evaluate: () => { throw new Error('boom'); },
      },
    };

    const runtime: RuntimeState = {
      nodes: {
        a: {
          outputs: { out: 'old' },
          dirty: true,
          error: null,
          lastValidOutputs: { out: 'old' },
        },
      },
      liveOrder: ['a'],
      hasFrameDriven: false,
      expressions: {},
    };

    const result = evaluateGraph([nodeA], [], defs, runtime, 0, 0.016);

    expect(result.nodes.a.error).toBe('boom');
    expect(result.nodes.a.outputs).toEqual({ out: 'old' });
  });

  it('resolves expression params', () => {
    const nodeA = makeNode('a', 'source', { val: 10 });
    const nodeB = makeNode('b', 'expr_node');
    // Override nodeB's param to expression mode
    nodeB.params.factor = { mode: 'expression', value: '@a:out * 2' };

    const nodes = [nodeA, nodeB];
    const connections: ConnectionData[] = [
      { id: 'c1', fromNode: 'a', fromPort: 'out', toNode: 'b', toPort: 'in' },
    ];

    // Compile the expression for the test
    const ast = parse('@a:out * 2');
    const deps = extractDeps(ast);

    const defs: Record<string, NodeDef> = {
      source: {
        type: 'source', category: 'geometry',
        inputs: [], outputs: [{ name: 'out', type: 'geometry' }],
        params: [{ name: 'val', type: 'float', default: 0 }],
        evaluate: (ctx) => ({ out: ctx.params.val }),
      },
      expr_node: {
        type: 'expr_node', category: 'geometry',
        inputs: [{ name: 'in', type: 'geometry' }],
        outputs: [{ name: 'out', type: 'geometry' }],
        params: [{ name: 'factor', type: 'float', default: 1 }],
        evaluate: (ctx) => ({ out: (ctx.inputs.in as number) * (ctx.params.factor as number) }),
      },
    };

    const runtime: RuntimeState = {
      nodes: { a: makeRuntimeNode(), b: makeRuntimeNode() },
      liveOrder: ['a', 'b'],
      hasFrameDriven: false,
      expressions: {
        'b:factor': { source: '@a:out * 2', ast, deps },
      },
    };

    const result = evaluateGraph(nodes, connections, defs, runtime, 0, 0.016);

    // nodeA outputs { out: 10 }
    // nodeB factor expression: @a:out * 2 = 10 * 2 = 20
    // nodeB evaluate: inputs.in (10) * params.factor (20) = 200
    expect(result.nodes.b.outputs).toEqual({ out: 200 });
  });

  it('only evaluates live nodes', () => {
    const nodeA = makeNode('a', 'source', { val: 1 });
    const nodeB = makeNode('b', 'source', { val: 2 });

    const evaluateA = vi.fn((ctx: EvaluateContext) => ({ out: ctx.params.val }));
    const evaluateB = vi.fn((ctx: EvaluateContext) => ({ out: ctx.params.val }));

    const defs: Record<string, NodeDef> = {
      source: {
        type: 'source', category: 'geometry',
        inputs: [], outputs: [{ name: 'out', type: 'geometry' }],
        params: [{ name: 'val', type: 'float', default: 0 }],
        evaluate: evaluateA,
      },
    };

    // Only nodeA is in liveOrder
    const runtime: RuntimeState = {
      nodes: { a: makeRuntimeNode(), b: makeRuntimeNode() },
      liveOrder: ['a'],
      hasFrameDriven: false,
      expressions: {},
    };

    evaluateGraph([nodeA, nodeB], [], defs, runtime, 0, 0.016);

    expect(evaluateA).toHaveBeenCalledTimes(1);
    // nodeB is not live, should not be evaluated (but uses same def so we check by liveOrder)
  });
});
