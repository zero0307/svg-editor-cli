import { DomainError } from '../domain/DomainError.js';

export interface Token {
  readonly value: string;
  readonly quoted: boolean;
}

export class Tokenizer {
  tokenize(line: string): readonly Token[] {
    const input = line.trim();
    if (!input || input.startsWith('#')) return [];
    const result: Token[] = [];
    let i = 0;
    while (i < input.length) {
      if (/\s/.test(input[i]!)) {
        i++;
        continue;
      }
      let value = '';
      const quoted = input[i] === '"';
      if (quoted) {
        i++;
        let closed = false;
        while (i < input.length) {
          const character = input[i++]!;
          if (character === '"') {
            closed = true;
            break;
          }
          if (character === '\\' && (input[i] === '"' || input[i] === '\\')) value += input[i++]!;
          else value += character;
        }
        if (!closed) throw new DomainError('unterminated quoted argument');
        if (i < input.length && !/\s/.test(input[i]!))
          throw new DomainError('expected whitespace after quoted argument');
      } else {
        while (i < input.length && !/\s/.test(input[i]!)) {
          if (input[i] === '"') throw new DomainError('quote must begin an argument');
          value += input[i++]!;
        }
      }
      result.push({ value, quoted });
    }
    return result;
  }
}
