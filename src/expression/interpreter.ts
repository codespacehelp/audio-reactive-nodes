import type { ASTNode } from './types';

/** Callback to resolve a reference. node is empty string for same-node refs. */
export type RefResolver = (node: string, name: string) => number;

/**
 * Evaluate an AST node to a numeric value.
 * References are resolved via the provided callback.
 */
export function evaluate(ast: ASTNode, resolveRef: RefResolver): number {
  switch (ast.kind) {
    case 'number':
      return ast.value;

    case 'ref':
      return resolveRef(ast.node, ast.name);

    case 'unary':
      return -evaluate(ast.operand, resolveRef);

    case 'binary': {
      const left = evaluate(ast.left, resolveRef);
      const right = evaluate(ast.right, resolveRef);
      switch (ast.op) {
        case '+': return left + right;
        case '-': return left - right;
        case '*': return left * right;
        case '/': return left / right;
      }
      break;
    }

    case 'call':
      return callBuiltin(ast.name, ast.args, resolveRef);
  }

  throw new Error(`Unknown AST node kind`);
}

interface BuiltinDef {
  arity: number;
  fn: (...args: number[]) => number;
}

const BUILTINS: Record<string, BuiltinDef> = {
  clamp: {
    arity: 3,
    fn: (val, min, max) => Math.min(max, Math.max(min, val)),
  },
  min: {
    arity: 2,
    fn: (a, b) => Math.min(a, b),
  },
  max: {
    arity: 2,
    fn: (a, b) => Math.max(a, b),
  },
  floor: {
    arity: 1,
    fn: (val) => Math.floor(val),
  },
  ceil: {
    arity: 1,
    fn: (val) => Math.ceil(val),
  },
  round: {
    arity: 1,
    fn: (val) => Math.round(val),
  },
  map: {
    arity: 5,
    fn: (val, inMin, inMax, outMin, outMax) => {
      const t = (val - inMin) / (inMax - inMin);
      return outMin + t * (outMax - outMin);
    },
  },
};

function callBuiltin(
  name: string,
  argNodes: ASTNode[],
  resolveRef: RefResolver,
): number {
  const builtin = BUILTINS[name];
  if (!builtin) {
    throw new Error(`Unknown function '${name}'`);
  }
  if (argNodes.length !== builtin.arity) {
    throw new Error(`Function '${name}' expects ${builtin.arity} arguments, got ${argNodes.length}`);
  }
  const args = argNodes.map((a) => evaluate(a, resolveRef));
  return builtin.fn(...args);
}
