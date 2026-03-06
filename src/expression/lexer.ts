import type { Token } from './types';

/**
 * Tokenize an expression string into a flat array of tokens.
 * Throws on invalid characters or malformed references.
 */
export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < source.length) {
    const ch = source[i];

    // Skip whitespace
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i++;
      continue;
    }

    // Numbers: digits or digit starting with dot
    if (ch >= '0' && ch <= '9' || (ch === '.' && i + 1 < source.length && source[i + 1] >= '0' && source[i + 1] <= '9')) {
      const start = i;
      while (i < source.length && source[i] >= '0' && source[i] <= '9') i++;
      if (i < source.length && source[i] === '.') {
        i++;
        while (i < source.length && source[i] >= '0' && source[i] <= '9') i++;
      }
      tokens.push({ type: 'number', value: source.slice(start, i), pos: start });
      continue;
    }

    // References: @node:channel or @:param
    if (ch === '@') {
      const start = i;
      i++; // skip @
      // Read optional node name
      while (i < source.length && isIdentChar(source[i])) i++;
      // Expect colon
      if (i >= source.length || source[i] !== ':') {
        throw new Error(`Expected ':' in reference at position ${start}`);
      }
      i++; // skip :
      // Read channel/param name
      if (i >= source.length || !isIdentChar(source[i])) {
        throw new Error(`Expected name after ':' in reference at position ${start}`);
      }
      while (i < source.length && isIdentChar(source[i])) i++;
      tokens.push({ type: 'ref', value: source.slice(start, i), pos: start });
      continue;
    }

    // Identifiers (function names)
    if (isIdentStart(ch)) {
      const start = i;
      while (i < source.length && isIdentChar(source[i])) i++;
      tokens.push({ type: 'ident', value: source.slice(start, i), pos: start });
      continue;
    }

    // Single-character tokens
    switch (ch) {
      case '+': tokens.push({ type: 'plus', value: '+', pos: i }); i++; continue;
      case '-': tokens.push({ type: 'minus', value: '-', pos: i }); i++; continue;
      case '*': tokens.push({ type: 'star', value: '*', pos: i }); i++; continue;
      case '/': tokens.push({ type: 'slash', value: '/', pos: i }); i++; continue;
      case '(': tokens.push({ type: 'lparen', value: '(', pos: i }); i++; continue;
      case ')': tokens.push({ type: 'rparen', value: ')', pos: i }); i++; continue;
      case ',': tokens.push({ type: 'comma', value: ',', pos: i }); i++; continue;
    }

    throw new Error(`Unexpected character '${ch}' at position ${i}`);
  }

  tokens.push({ type: 'eof', value: '', pos: i });
  return tokens;
}

function isIdentStart(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
}

function isIdentChar(ch: string): boolean {
  return isIdentStart(ch) || (ch >= '0' && ch <= '9');
}
