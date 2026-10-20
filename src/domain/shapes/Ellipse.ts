import { GeometryShape } from './GeometryShape.js';

export class Ellipse extends GeometryShape {
  readonly tag = 'ellipse';
  constructor(id: string, cx: number, cy: number, rx: number, ry: number) {
    super(id, { cx, cy, rx, ry }, ['rx', 'ry']);
  }
  override move(dx: number, dy: number): void {
    this.translate(['cx'], ['cy'], dx, dy);
  }
  override clone(): Ellipse {
    const copy = new Ellipse(
      this.id,
      this.get('cx'),
      this.get('cy'),
      this.get('rx'),
      this.get('ry'),
    );
    this.copyPresentationTo(copy);
    return copy;
  }
  override summary(): string {
    return `cx=${this.get('cx')} cy=${this.get('cy')} rx=${this.get('rx')} ry=${this.get('ry')}${this.styleSummary()}`;
  }
}
