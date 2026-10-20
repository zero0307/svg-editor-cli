import { DomainError } from '../domain/DomainError.js';
import { Numbers } from '../domain/Numbers.js';
import { Rect } from '../domain/shapes/Rect.js';
import { Circle } from '../domain/shapes/Circle.js';
import { Ellipse } from '../domain/shapes/Ellipse.js';
import { Line } from '../domain/shapes/Line.js';
import { Text } from '../domain/shapes/Text.js';
import { Group } from '../domain/shapes/Group.js';
import type { Shape } from '../domain/shapes/Shape.js';

interface Definition {
  readonly fields: readonly string[];
  readonly optionalStyle?: string;
  readonly text?: boolean;
  readonly construct: (id: string, args: readonly string[]) => Shape;
}

/** Name dispatch #2: replace built-ins with providers in the future plugin phase. */
export class ShapeFactory {
  private readonly definitions: ReadonlyMap<string, Definition> = new Map([
    [
      'rect',
      {
        fields: ['x', 'y', 'width', 'height'],
        optionalStyle: 'fill',
        construct: (id, a) => new Rect(id, this.n(a, 0), this.n(a, 1), this.n(a, 2), this.n(a, 3)),
      },
    ],
    [
      'circle',
      {
        fields: ['cx', 'cy', 'r'],
        optionalStyle: 'fill',
        construct: (id, a) => new Circle(id, this.n(a, 0), this.n(a, 1), this.n(a, 2)),
      },
    ],
    [
      'ellipse',
      {
        fields: ['cx', 'cy', 'rx', 'ry'],
        optionalStyle: 'fill',
        construct: (id, a) =>
          new Ellipse(id, this.n(a, 0), this.n(a, 1), this.n(a, 2), this.n(a, 3)),
      },
    ],
    [
      'line',
      {
        fields: ['x1', 'y1', 'x2', 'y2'],
        optionalStyle: 'stroke',
        construct: (id, a) => new Line(id, this.n(a, 0), this.n(a, 1), this.n(a, 2), this.n(a, 3)),
      },
    ],
    [
      'text',
      {
        fields: ['x', 'y'],
        text: true,
        construct: (id, a) => new Text(id, this.n(a, 0), this.n(a, 1), a[2]!),
      },
    ],
    ['g', { fields: [], construct: (id) => new Group(id) }],
  ]);
  private n(args: readonly string[], index: number): number {
    return Numbers.parse(args[index]!, `parameter ${index + 1}`);
  }
  private definition(type: string): Definition {
    const definition = this.definitions.get(type);
    if (!definition) throw new DomainError(`unknown shape type: ${type} (is the plugin loaded?)`);
    return definition;
  }
  create(type: string, id: string, args: readonly string[]): Shape {
    const definition = this.definition(type);
    const required = definition.fields.length + (definition.text ? 1 : 0);
    if (args.length < required || args.length > required + (definition.optionalStyle ? 1 : 0))
      throw new DomainError(`invalid parameters for ${type}`);
    const shape = definition.construct(id, args);
    if (definition.optionalStyle && args.length > required)
      shape.setAttribute(definition.optionalStyle, args[required]!);
    return shape;
  }
  fromSvg(
    type: string,
    id: string,
    attributes: Readonly<Record<string, string>>,
    text: string,
  ): Shape {
    const definition = this.definition(type);
    const args = definition.fields.map((field) => attributes[field] ?? '0');
    if (definition.text) args.push(text);
    const shape = this.create(type, id, args);
    for (const [name, value] of Object.entries(attributes)) {
      if (name === 'id' || definition.fields.includes(name) || name.startsWith('xmlns')) continue;
      if (name === 'fill' || name === 'stroke' || name === 'stroke-width')
        shape.setAttribute(name, value);
      else shape.preserveAttribute(name, value);
    }
    return shape;
  }
}
