import test from 'node:test';
import assert from 'node:assert/strict';
import { SvgString } from '../src/domain/SvgString.js';
import { Rect } from '../src/domain/shapes/Rect.js';
import { Text } from '../src/domain/shapes/Text.js';
import { TestHarness } from './TestHarness.js';

const invalidStrings = [
  ...Array.from({ length: 0x20 }, (_, point) => point)
    .filter((point) => ![0x9, 0xa, 0xd].includes(point))
    .map((point) => String.fromCodePoint(point)),
  '\ufffe',
  '\uffff',
  '\ud800',
  '\udbff',
  '\udc00',
  '\udfff',
];

test('SVG strings reject XML 1.0 forbidden characters and unpaired surrogates', () => {
  for (const value of invalidStrings) {
    assert.throws(() => SvgString.validate(value, 'test'), /invalid XML character in test/);
    assert.throws(() => new Text('t', 0, 0, value), /invalid XML character in text/);
    assert.throws(() => new Rect(`bad${value}`, 0, 0, 1, 1), /invalid XML character in id/);
    const shape = new Rect('r', 0, 0, 1, 1);
    const before = shape.attributes();
    assert.throws(() => shape.setAttribute('fill', value), /invalid XML character/);
    assert.throws(() => shape.preserveAttribute('data-note', value), /invalid XML character/);
    assert.deepEqual(shape.attributes(), before);
  }
});

test('illegal strings fail atomically and preserve redo history', async () => {
  const h = new TestHarness();
  await h.run(
    'init',
    'create text t 0 0 "original"',
    'create rect r 0 0 1 1',
    'move r 5 0',
    'undo',
  );
  const before = h.snapshot();
  for (const value of invalidStrings) {
    for (const command of [
      `create g "bad${value}"`,
      `create text invalid 0 0 "${value}"`,
      `set t text "${value}"`,
      `set r fill "${value}"`,
      `set r stroke "${value}"`,
    ]) {
      const result = await h.router.execute(command);
      assert.equal(result.length, 1);
      assert.match(result[0]!, /^error: invalid XML character/);
      assert.equal(h.snapshot(), before);
    }
  }
  await h.run('redo');
  assert.equal(h.editor.document().require('r').geometry().x, '5');
});

test('legal Unicode, Chinese, emoji, tabs and newlines remain valid SVG content', async () => {
  const allowed = '\t\n\r 中文 😀 \u0020\ud7ff\ue000\ufffd\u{10000}\u{10ffff}';
  assert.equal(SvgString.validate(allowed, 'text'), allowed);
  const h = new TestHarness();
  const content = '第一行 😀\n第二行\t<&>"';
  await h.run('init', 'create text t 1 2 "original"');
  h.editor.document().require('t').setAttribute('text', content);
  const source = h.snapshot();
  const decoded = h.codec.decode(source);
  assert.equal(decoded.document.require('t').textContent(), content);
  assert.equal(h.codec.encode(decoded.document), source);
});

test('carriage returns and attribute whitespace survive standard XML normalization', () => {
  const h = new TestHarness();
  const source = '<svg><text id="t" data-note="A&#9;B&#10;C&#13;D">A&#13;B&#10;C</text></svg>';
  const document = h.codec.decode(source).document;
  const saved = h.codec.encode(document);
  const reloaded = h.codec.decode(saved).document;
  assert.equal(reloaded.require('t').textContent(), 'A\rB\nC');
  assert.equal(reloaded.require('t').attributes()['data-note'], 'A\tB\nC\rD');
});
