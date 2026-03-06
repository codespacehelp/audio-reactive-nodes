import type { ASTNode } from './types';
import type { ExpressionDep } from '../types/runtime';

/**
 * Walk an AST and extract all unique reference dependencies.
 */
export function extractDeps(ast: ASTNode): ExpressionDep[] {
  const seen = new Set<string>();
  const deps: ExpressionDep[] = [];

  function walk(node: ASTNode) {
    switch (node.kind) {
      case 'number':
        break;
      case 'ref': {
        const key = `${node.node}:${node.name}`;
        if (!seen.has(key)) {
          seen.add(key);
          deps.push({ node: node.node, name: node.name });
        }
        break;
      }
      case 'unary':
        walk(node.operand);
        break;
      case 'binary':
        walk(node.left);
        walk(node.right);
        break;
      case 'call':
        for (const arg of node.args) walk(arg);
        break;
    }
  }

  walk(ast);
  return deps;
}
