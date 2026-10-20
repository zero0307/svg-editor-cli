import type { SvgDocument } from '../domain/SvgDocument.js';
import type { Shape } from '../domain/shapes/Shape.js';

export class ShapePresenter {
  tree(document: SvgDocument, id?: string): readonly string[] {
    const lines: string[] = [];
    const visit = (shape: Shape, prefix: string, connector: string): void => {
      lines.push(`${prefix}${connector}${shape.tag}#${shape.id}${shape.summary() ? `  ${shape.summary()}` : ''}`);
      const children = shape.children();
      children.forEach((child, index) => visit(child, prefix + (connector === '' ? '' : connector === '└── ' ? '    ' : '│   '), index === children.length - 1 ? '└── ' : '├── '));
    };
    if (id !== undefined) visit(document.require(id), '', '');
    else {
      lines.push(`svg (${document.width}x${document.height})`);
      const children = document.root.children();
      children.forEach((shape, index) => visit(shape, '', index === children.length - 1 ? '└── ' : '├── '));
    }
    return lines;
  }
  show(document: SvgDocument, id: string): readonly string[] {
    const shape = document.require(id);
    const lines = [`${shape.tag}#${shape.id}  parent=${shape.parent === document.root ? 'svg' : `g#${shape.parent!.id}`}`];
    for (const [name, value] of Object.entries(shape.attributes())) lines.push(`  ${name}=${value}`);
    if (shape.textContent() !== null) lines.push(`  text=${JSON.stringify(shape.textContent())}`);
    if (shape.children().length) lines.push(`  children=${shape.children().map(child => child.id).join(', ')}`);
    return lines;
  }
}
