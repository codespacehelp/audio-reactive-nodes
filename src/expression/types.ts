// ─── Tokens ───────────────────────────────────

export type TokenType =
  | 'number'
  | 'ref'        // @node:channel or @:param
  | 'ident'      // function name
  | 'plus'
  | 'minus'
  | 'star'
  | 'slash'
  | 'lparen'
  | 'rparen'
  | 'comma'
  | 'eof';

export interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

// ─── AST Nodes ────────────────────────────────

export type ASTNode =
  | NumberLiteral
  | RefNode
  | UnaryOp
  | BinaryOp
  | FunctionCall;

export interface NumberLiteral {
  kind: 'number';
  value: number;
}

export interface RefNode {
  kind: 'ref';
  /** Node name (empty string for same-node @:param refs) */
  node: string;
  /** Channel or param name */
  name: string;
}

export interface UnaryOp {
  kind: 'unary';
  op: '-';
  operand: ASTNode;
}

export interface BinaryOp {
  kind: 'binary';
  op: '+' | '-' | '*' | '/';
  left: ASTNode;
  right: ASTNode;
}

export interface FunctionCall {
  kind: 'call';
  name: string;
  args: ASTNode[];
}
