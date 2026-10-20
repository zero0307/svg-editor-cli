import { GeometryShape } from './GeometryShape.js';

export class Rect extends GeometryShape {
  readonly tag = 'rect';
  constructor(id: string, x: number, y: number, width: number, height: number) {
    super(id, { x, y, width, height }, ['width', 'height']);
  }
  override move(dx: number, dy: number): void {
    this.translate(['x'], ['y'], dx, dy);
  }
  override clone(): Rect {
    const copy = new Rect(
      this.id,
      this.get('x'),
      this.get('y'),
      this.get('width'),
      this.get('height'),
    );
    this.copyPresentationTo(copy);
    return copy;
  }
  override summary(): string {
    return `x=${this.get('x')} y=${this.get('y')} w=${this.get('width')} h=${this.get('height')}${this.styleSummary()}`;
  }
}
