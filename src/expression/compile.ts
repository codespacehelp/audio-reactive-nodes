import { parse } from './parser';
import { extractDeps } from './deps';
import type { CompiledExpression } from '../types/runtime';

/**
 * Compile an expression source string into a CompiledExpression.
 * Throws if the source has syntax errors.
 */
export function compileExpression(source: string): CompiledExpression {
  const ast = parse(source);
  const deps = extractDeps(ast);
  return { source, ast, deps };
}
