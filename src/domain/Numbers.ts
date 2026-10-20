import { DomainError } from './DomainError.js';

export class Numbers {
  static parse(value: string, name: string): number {
    if (!value.trim() || !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value)) {
      throw new DomainError(`invalid number for ${name}: ${value}`);
    }
    return this.finite(Number(value), name);
  }
  static finite(value: number, name: string): number {
    if (!Number.isFinite(value)) throw new DomainError(`${name} must be finite`);
    return Object.is(value, -0) ? 0 : value;
  }
  static nonnegative(value: number, name: string): number {
    this.finite(value, name);
    if (value < 0) throw new DomainError(`${name} must be non-negative`);
    return value;
  }
  static positive(value: number, name: string): number {
    this.finite(value, name);
    if (value <= 0) throw new DomainError(`${name} must be positive`);
    return value;
  }
  static format(value: number): string { return String(Object.is(value, -0) ? 0 : value); }
}
