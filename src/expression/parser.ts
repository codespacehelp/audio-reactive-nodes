import type { Token, ASTNode } from './types';
import { tokenize } from './lexer';

/**
 * Parse an expression string into an AST.
 * Grammar (precedence low→high):
 *   expr     → term (('+' | '-') term)*
 *   term     → unary (('*' | '/') unary)*
 *   unary    → '-' unary | primary
 *   primary  → NUMBER | REF | IDENT '(' args ')' | '(' expr ')'
 *   args     → expr (',' expr)*
 */
export function parse(source: string): ASTNode {
  const tokens = tokenize(source);
  let pos = 0;

  function peek(): Token {
    return tokens[pos];
  }

  function advance(): Token {
    return tokens[pos++];
  }

  function expect(type: string): Token {
    const t = peek();
    if (t.type !== type) {
      throw new Error(`Expected ${type} but got ${t.type} '${t.value}' at position ${t.pos}`);
    }
    return advance();
  }

  function parseExpr(): ASTNode {
    let left = parseTerm();
    while (peek().type === 'plus' || peek().type === 'minus') {
      const op = advance().value as '+' | '-';
      const right = parseTerm();
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }

  function parseTerm(): ASTNode {
    let left = parseUnary();
    while (peek().type === 'star' || peek().type === 'slash') {
      const op = advance().value as '*' | '/';
      const right = parseUnary();
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }

  function parseUnary(): ASTNode {
    if (peek().type === 'minus') {
      advance();
      const operand = parseUnary();
      return { kind: 'unary', op: '-', operand };
    }
    return parsePrimary();
  }

  function parsePrimary(): ASTNode {
    const t = peek();

    // Number literal
    if (t.type === 'number') {
      advance();
      return { kind: 'number', value: parseFloat(t.value) };
    }

    // Reference: @node:channel or @:param
    if (t.type === 'ref') {
      advance();
      return parseRef(t.value);
    }

    // Identifier: either a function call or a bare name (treated as @:name)
    if (t.type === 'ident') {
      advance();
      if (peek().type === 'lparen') {
        // Function call
        advance(); // consume '('
        const args: ASTNode[] = [];
        if (peek().type !== 'rparen') {
          args.push(parseExpr());
          while (peek().type === 'comma') {
            advance();
            args.push(parseExpr());
          }
        }
        expect('rparen');
        return { kind: 'call', name: t.value, args };
      }
      // Bare identifier → treat as same-node param ref
      return { kind: 'ref', node: '', name: t.value };
    }

    // Parenthesized expression
    if (t.type === 'lparen') {
      advance();
      const expr = parseExpr();
      expect('rparen');
      return expr;
    }

    throw new Error(`Unexpected token ${t.type} '${t.value}' at position ${t.pos}`);
  }

  const ast = parseExpr();

  if (peek().type !== 'eof') {
    const t = peek();
    throw new Error(`Unexpected token ${t.type} '${t.value}' at position ${t.pos}`);
  }

  return ast;
}

/**
 * Parse a ref token value like "@channel_map1:low" or "@:x"
 * into { node, name }.
 */
function parseRef(refStr: string): { kind: 'ref'; node: string; name: string } {
  // Strip leading @
  const body = refStr.slice(1);
  const colonIdx = body.indexOf(':');
  return {
    kind: 'ref',
    node: body.slice(0, colonIdx),
    name: body.slice(colonIdx + 1),
  };
}
