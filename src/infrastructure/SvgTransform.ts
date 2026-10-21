import { DomainError } from '../domain/DomainError.js';
import { Numbers } from '../domain/Numbers.js';

/** Positive uniform affine transform: p -> scale * p + (dx, dy). */
export class SvgTransform {
  constructor(
    readonly scale = 1,
    readonly dx = 0,
    readonly dy = 0,
  ) {
    Numbers.positive(scale, 'SVG transform scale');
    Numbers.finite(dx, 'SVG transform dx');
    Numbers.finite(dy, 'SVG transform dy');
  }
  compose(local: SvgTransform): SvgTransform {
    return new SvgTransform(
      this.scale * local.scale,
      this.dx + this.scale * local.dx,
      this.dy + this.scale * local.dy,
    );
  }
  static parse(source: string): SvgTransform {
    let result = new SvgTransform();
    let end = 0;
    const expression = /([A-Za-z]+)\s*\(([^()]*)\)/g;
    const number = '[+-]?(?:\\d+\\.?\\d*|\\.\\d+)(?:[eE][+-]?\\d+)?';
    const parameters = new RegExp(`^\\s*(${number})(?:(?:\\s*,\\s*|\\s+)(${number}))?\\s*$`);
    for (const match of source.matchAll(expression)) {
      const separator = source.slice(end, match.index);
      if (!(end === 0 ? /^\s*$/ : /^\s*,?\s*$/).test(separator)) this.invalid();
      const args = parameters.exec(match[2]!);
      if (!args) this.invalid();
      const first = Numbers.parse(args[1]!, 'SVG transform');
      const second = args[2] === undefined ? undefined : Numbers.parse(args[2], 'SVG transform');
      if (match[1] === 'translate')
        result = result.compose(new SvgTransform(1, first, second ?? 0));
      else if (match[1] === 'scale') {
        if (first <= 0 || (second !== undefined && second !== first)) this.invalid();
        result = result.compose(new SvgTransform(first));
      } else this.invalid();
      end = match.index + match[0].length;
    }
    if (!/^\s*$/.test(source.slice(end)) || (end === 0 && source.trim())) this.invalid();
    return result;
  }
  private static invalid(): never {
    throw new DomainError('unsupported SVG transform: use translate and positive uniform scale');
  }
}
