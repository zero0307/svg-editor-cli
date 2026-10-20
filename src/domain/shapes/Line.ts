import { GeometryShape } from './GeometryShape.js';

export class Line extends GeometryShape {
  readonly tag = 'line';
  constructor(id: string, x1: number, y1: number, x2: number, y2: number) { super(id, { x1, y1, x2, y2 }, []); }
  override move(dx: number, dy: number): void { this.translate(['x1', 'x2'], ['y1', 'y2'], dx, dy); }
  override clone(): Line {
    const copy = new Line(this.id, this.get('x1'), this.get('y1'), this.get('x2'), this.get('y2'));
    this.copyPresentationTo(copy); return copy;
  }
  override summary(): string { return `(${this.get('x1')},${this.get('y1')}) -> (${this.get('x2')},${this.get('y2')})${this.styleSummary()}`; }
}
