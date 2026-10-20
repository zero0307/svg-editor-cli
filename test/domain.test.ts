import test from 'node:test';
import assert from 'node:assert/strict';
import { Rect } from '../src/domain/shapes/Rect.js';
import { Circle } from '../src/domain/shapes/Circle.js';
import { Ellipse } from '../src/domain/shapes/Ellipse.js';
import { Line } from '../src/domain/shapes/Line.js';
import { Text } from '../src/domain/shapes/Text.js';
import { Group } from '../src/domain/shapes/Group.js';
import { Numbers } from '../src/domain/Numbers.js';
import { SvgDocument } from '../src/domain/SvgDocument.js';

test('each leaf owns move, scale, geometry validation and clone behavior', () => {
  const cases = [
    {
      shape: new Rect('r', 1, 2, 3, 4),
      moved: { x: '11', y: '22', width: '3', height: '4' },
      scaled: { x: '22', y: '44', width: '6', height: '8' },
    },
    {
      shape: new Circle('c', 1, 2, 3),
      moved: { cx: '11', cy: '22', r: '3' },
      scaled: { cx: '22', cy: '44', r: '6' },
    },
    {
      shape: new Ellipse('e', 1, 2, 3, 4),
      moved: { cx: '11', cy: '22', rx: '3', ry: '4' },
      scaled: { cx: '22', cy: '44', rx: '6', ry: '8' },
    },
    {
      shape: new Line('l', 1, 2, 3, 4),
      moved: { x1: '11', y1: '22', x2: '13', y2: '24' },
      scaled: { x1: '22', y1: '44', x2: '26', y2: '48' },
    },
    {
      shape: new Text('t', 1, 2, '中文 <&>'),
      moved: { x: '11', y: '22' },
      scaled: { x: '22', y: '44' },
    },
  ];
  for (const { shape, moved, scaled } of cases) {
    shape.move(10, 20);
    assert.deepEqual(shape.geometry(), moved);
    shape.scale(2);
    assert.deepEqual(shape.geometry(), scaled);
    shape.setAttribute('fill', 'red');
    shape.setAttribute('stroke-width', '.5');
    const clone = shape.clone();
    clone.move(1, 1);
    clone.setAttribute('fill', 'blue');
    assert.deepEqual(shape.geometry(), scaled);
    assert.equal(shape.attributes().fill, 'red');
    assert.equal(clone.attributes()['stroke-width'], '0.5');
    assert.throws(() => shape.setAttribute('id', 'changed'), /unknown attribute/);
    assert.throws(() => shape.scale(0), /positive/);
  }
});

test('Composite traverses nested children exactly once, independent of ids', () => {
  const parent = new Group('g');
  const nested = new Group('g2');
  const circle = new Circle('c', 2, 3, 4);
  nested.insert(circle);
  parent.insert(nested);
  parent.move(10, 20);
  parent.scale(2);
  assert.deepEqual(circle.geometry(), { cx: '24', cy: '46', r: '8' });
  const clone = parent.clone();
  clone.move(100, 100);
  assert.deepEqual(circle.geometry(), { cx: '24', cy: '46', r: '8' });
  assert.equal(clone.children()[0]!.parent, clone);
  assert.throws(() => nested.insert(parent), /own descendant/);
  assert.throws(() => parent.insert(parent), /own descendant/);
});

test('dimensions, numeric grammar, finite arithmetic and attributes are validated', () => {
  for (const value of ['NaN', 'Infinity', '0x10', '', '12px', '1 2'])
    assert.throws(() => Numbers.parse(value, 'x'));
  assert.equal(Numbers.parse('-.5e2', 'x'), -50);
  assert.equal(Numbers.format(-0), '0');
  assert.throws(() => new Rect('r', 0, 0, -1, 1), /non-negative/);
  assert.throws(() => new Circle('c', 0, 0, -1), /non-negative/);
  assert.throws(() => new Ellipse('e', 0, 0, 1, -1), /non-negative/);
  assert.throws(() => new Rect('bad id', 0, 0, 1, 1), /invalid id/);
  const rect = new Rect('r', 0, 0, 1, 1);
  assert.throws(() => rect.setAttribute('stroke-width', '-1'), /non-negative/);
  assert.throws(() => rect.setAttribute('width', '-1'), /non-negative/);
  rect.setAttribute('x', '-1.25');
  assert.equal(rect.geometry().x, '-1.25');
  const huge = new Line('huge', 1, 1, 1e308, 1);
  const before = huge.geometry();
  assert.throws(() => huge.scale(10), /finite/);
  assert.deepEqual(huge.geometry(), before);
});

test('document ids include descendants, remain case-sensitive and do not reserve canvas', () => {
  const document = new SvgDocument();
  const group = new Group('canvas');
  group.insert(new Text('Title', 0, 0, 'hello'));
  document.add(group);
  document.add(new Text('title', 1, 2, 'world'));
  assert.equal(document.all().length, 3);
  assert.throws(() => document.add(new Group('Title')), /id already exists/);
  assert.throws(() => document.container('title'), /not a container/);
  assert.throws(() => document.container('missing'), /no such container/);
  assert.throws(() => document.resize(100, -1));
  assert.equal(document.width, 800);
  const copy = document.clone();
  copy.container('canvas').remove(copy.require('Title'));
  assert.equal(document.all().length, 3);
});
