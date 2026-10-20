import { DomainError } from '../domain/DomainError.js';
import { Numbers } from '../domain/Numbers.js';
import type { Token } from './Tokenizer.js';

export class CommandArguments {
  constructor(
    private readonly tokens: readonly Token[],
    private readonly usage: string,
  ) {}
  get length(): number {
    return this.tokens.length;
  }
  requireCount(min: number, max = min): void {
    if (this.length < min || this.length > max) throw new DomainError(`usage: ${this.usage}`);
  }
  value(index: number): string {
    const token = this.tokens[index];
    if (!token) throw new DomainError(`usage: ${this.usage}`);
    return token.value;
  }
  number(index: number): number {
    return Numbers.parse(this.value(index), `argument ${index + 1}`);
  }
  values(start = 0, end = this.length): readonly string[] {
    return this.tokens.slice(start, end).map((token) => token.value);
  }
  containerSuffix(): { args: readonly string[]; containerId?: string } {
    const marker = this.tokens.at(-2);
    if (marker?.value === 'in' && !marker.quoted && this.length >= 4) {
      return { args: this.values(2, this.length - 2), containerId: this.value(this.length - 1) };
    }
    return { args: this.values(2) };
  }
}
