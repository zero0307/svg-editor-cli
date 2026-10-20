import { GeometryShape } from './GeometryShape.js';

export class Text extends GeometryShape {
  readonly tag = 'text';
  constructor(
    id: string,
    x: number,
    y: number,
    private content: string,
  ) {
    super(id, { x, y }, []);
  }
  override move(dx: number, dy: number): void {
    this.translate(['x'], ['y'], dx, dy);
  }
  override clone(): Text {
    const copy = new Text(this.id, this.get('x'), this.get('y'), this.content);
    this.copyPresentationTo(copy);
    return copy;
  }
  override textContent(): string {
    return this.content;
  }
  protected override setSpecificAttribute(name: string, value: string): void {
    if (name === 'text') this.content = value;
    else super.setSpecificAttribute(name, value);
  }
  override summary(): string {
    return `(${this.get('x')},${this.get('y')}) ${JSON.stringify(this.content)}${this.styleSummary()}`;
  }
}
