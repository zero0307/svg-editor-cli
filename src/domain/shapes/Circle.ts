import { GeometryShape } from './GeometryShape.js';

export class Circle extends GeometryShape {
  readonly tag = 'circle';
  constructor(id: string, cx: number, cy: number, r: number) {
    super(id, { cx, cy, r }, ['r']);
  }
  override move(dx: number, dy: number): void {
    this.translate(['cx'], ['cy'], dx, dy);
  }
  override clone(): Circle {
    const copy = new Circle(this.id, this.get('cx'), this.get('cy'), this.get('r'));
    this.copyPresentationTo(copy);
    return copy;
  }
  override summary(): string {
    return `cx=${this.get('cx')} cy=${this.get('cy')} r=${this.get('r')}${this.styleSummary()}`;
  }
}
