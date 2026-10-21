import { DomainError } from './DomainError.js';

/** XML 1.0 permits Unicode scalar values except a small set of control characters. */
export class SvgString {
  static validate(value: string, name: string): string {
    for (const character of value) {
      const point = character.codePointAt(0)!;
      if (
        point === 0x9 ||
        point === 0xa ||
        point === 0xd ||
        (point >= 0x20 && point <= 0xd7ff) ||
        (point >= 0xe000 && point <= 0xfffd) ||
        (point >= 0x10000 && point <= 0x10ffff)
      )
        continue;
      throw new DomainError(`invalid XML character in ${name}`);
    }
    return value;
  }
}
