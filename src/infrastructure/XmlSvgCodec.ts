import {
  DOMImplementation,
  DOMParser,
  XMLSerializer,
  type Element,
  type Node,
} from '@xmldom/xmldom';
import { DomainError } from '../domain/DomainError.js';
import { Numbers } from '../domain/Numbers.js';
import { SvgDocument } from '../domain/SvgDocument.js';
import { Group } from '../domain/shapes/Group.js';
import type { Shape } from '../domain/shapes/Shape.js';
import type { SvgCodec } from '../application/ports/SvgCodec.js';
import type { ShapeFactory } from '../application/ShapeFactory.js';

/** Strict SVG subset: unsupported constructs fail before replacing the document. */
export class XmlSvgCodec implements SvgCodec {
  private readonly namespace = 'http://www.w3.org/2000/svg';
  constructor(private readonly factory: ShapeFactory) {}
  decode(source: string): { document: SvgDocument; warnings: readonly string[] } {
    if (/<!DOCTYPE|<!ENTITY/i.test(source))
      throw new DomainError('unsupported SVG: DTD and entities');
    let parsed;
    try {
      parsed = new DOMParser({
        onError: (_level, message) => {
          throw new Error(message);
        },
      }).parseFromString(source, 'application/xml');
    } catch {
      throw new DomainError('invalid SVG XML');
    }
    const root = parsed.documentElement;
    if (!root || root.localName !== 'svg') throw new DomainError('invalid SVG: root must be <svg>');
    if (root.namespaceURI && root.namespaceURI !== this.namespace)
      throw new DomainError('invalid SVG namespace');
    const width = this.length(root.getAttribute('width') ?? '800', 'width');
    const height = this.length(root.getAttribute('height') ?? '600', 'height');
    const document = new SvgDocument(width, height);
    const viewBox = root.getAttribute('viewBox');
    if (viewBox !== null) {
      const values = viewBox
        .trim()
        .split(/[\s,]+/)
        .map((value) => Numbers.parse(value, 'viewBox'));
      if (
        values.length !== 4 ||
        values[0] !== 0 ||
        values[1] !== 0 ||
        values[2] !== width ||
        values[3] !== height
      ) {
        throw new DomainError('unsupported SVG viewBox: expected 0 0 width height');
      }
    }
    for (let i = 0; i < root.attributes.length; i++) {
      const name = root.attributes.item(i)!.name;
      if (
        !['width', 'height', 'viewBox', 'xmlns', 'version'].includes(name) &&
        !name.startsWith('xmlns:')
      )
        throw new DomainError(`unsupported SVG root attribute: ${name}`);
    }
    const used = new Set<string>();
    const collect = (element: Element, depth = 1): void => {
      if (depth > 128) throw new DomainError('SVG nesting exceeds 128 levels');
      const id = element.getAttribute('id');
      if (id) {
        if (used.has(id)) throw new DomainError(`id already exists: ${id}`);
        used.add(id);
      }
      this.elements(element).forEach((child) => collect(child, depth + 1));
    };
    this.elements(root).forEach((child) => collect(child));
    const warnings: string[] = [];
    const counters = new Map<string, number>();
    const visit = (element: Element, parent: Group, depth: number): void => {
      if (depth > 128) throw new DomainError('SVG nesting exceeds 128 levels');
      if (element.namespaceURI && element.namespaceURI !== this.namespace)
        throw new DomainError('unsupported SVG namespace');
      const tag = element.localName ?? element.tagName;
      let id = element.getAttribute('id');
      if (!id) {
        let number = counters.get(tag) ?? 1;
        while (used.has(`${tag}${number}`)) number++;
        id = `${tag}${number}`;
        counters.set(tag, number + 1);
        used.add(id);
        warnings.push(`warning: assigned id ${id} to unnamed <${tag}>`);
      }
      const attributes: Record<string, string> = {};
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes.item(i)!;
        if (attr.prefix && attr.prefix !== 'xml' && attr.prefix !== 'xmlns') {
          throw new DomainError(`unsupported SVG attribute namespace: ${attr.prefix}`);
        }
        if (attr.name === 'transform' || attr.name === 'style' || /^on/i.test(attr.name))
          throw new DomainError(`unsupported SVG attribute: ${attr.name}`);
        attributes[attr.name] = attr.value;
      }
      const shape = this.factory.fromSvg(tag, id, attributes, element.textContent ?? '');
      const children = this.elements(element);
      if (children.length && !(shape instanceof Group))
        throw new DomainError(`unsupported child elements in <${tag}>`);
      if (shape instanceof Group && this.nonWhitespaceText(element))
        throw new DomainError('unsupported text outside <text>');
      document.add(shape, parent);
      if (shape instanceof Group) children.forEach((child) => visit(child, shape, depth + 1));
    };
    if (this.nonWhitespaceText(root)) throw new DomainError('unsupported text outside <text>');
    this.elements(root).forEach((element) => visit(element, document.root, 1));
    document.validate();
    return { document, warnings };
  }
  encode(document: SvgDocument): string {
    const xml = new DOMImplementation().createDocument(this.namespace, 'svg', null);
    const root = xml.documentElement!;
    root.setAttribute('xmlns', this.namespace);
    root.setAttribute('width', String(document.width));
    root.setAttribute('height', String(document.height));
    root.setAttribute('viewBox', `0 0 ${document.width} ${document.height}`);
    const append = (shape: Shape, parent: Element, depth: number): void => {
      const element = xml.createElementNS(this.namespace, shape.tag);
      element.setAttribute('id', shape.id);
      for (const [name, value] of Object.entries(shape.attributes()))
        element.setAttribute(name, value);
      const content = shape.textContent();
      if (content !== null) element.appendChild(xml.createTextNode(content));
      parent.appendChild(xml.createTextNode(`\n${'  '.repeat(depth)}`));
      parent.appendChild(element);
      shape.children().forEach((child) => append(child, element, depth + 1));
      if (shape.children().length)
        element.appendChild(xml.createTextNode(`\n${'  '.repeat(depth)}`));
    };
    document.root.children().forEach((shape) => append(shape, root, 1));
    root.appendChild(xml.createTextNode('\n'));
    return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(xml)}\n`;
  }
  private elements(parent: Element): Element[] {
    return Array.from(parent.childNodes).filter(
      (node: Node): node is Element => node.nodeType === 1,
    );
  }
  private nonWhitespaceText(parent: Element): boolean {
    return Array.from(parent.childNodes).some(
      (node) => (node.nodeType === 3 || node.nodeType === 4) && Boolean(node.nodeValue?.trim()),
    );
  }
  private length(value: string, name: string): number {
    return Numbers.parse(value.replace(/px$/, ''), name);
  }
}
