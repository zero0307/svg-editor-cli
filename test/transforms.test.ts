import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SvgTransform } from '../src/infrastructure/SvgTransform.js';
import { TestHarness } from './TestHarness.js';

test('transform lists use SVG matrix order, including nested composition', () => {
  const translated = SvgTransform.parse('translate(10 20) scale(2)');
  assert.deepEqual([translated.scale, translated.dx, translated.dy], [2, 10, 20]);
  const scaled = SvgTransform.parse('scale(2) translate(10,20)');
  assert.deepEqual([scaled.scale, scaled.dx, scaled.dy], [2, 20, 40]);
  const composed = translated.compose(SvgTransform.parse('translate(3,4) scale(.5)'));
  assert.deepEqual([composed.scale, composed.dx, composed.dy], [1, 16, 28]);
  assert.equal(SvgTransform.parse('translate(1e2), scale(2,2)').dx, 100);
});

test('course transform example imports to canvas geometry and round-trips canonically', async () => {
  const h = new TestHarness();
  h.files.set('example.svg', await readFile('examples/transforms.svg', 'utf8'));
  await h.run('read example.svg');
  assert.deepEqual(h.editor.document().require('a').geometry(), {
    x: '60',
    y: '40',
    width: '120',
    height: '60',
  });
  assert.deepEqual(h.editor.document().require('b').geometry(), {
    x: '260',
    y: '40',
    width: '96',
    height: '48',
  });
  assert.deepEqual(h.editor.document().require('label').geometry(), { x: '308', y: '70.4' });
  assert.equal(h.editor.document().require('label').attributes()['font-size'], '12.8');
  const encoded = h.snapshot();
  assert.doesNotMatch(encoded, /transform=/);
  assert.equal(h.codec.encode(h.codec.decode(encoded).document), encoded);
  await h.run('move nodeB 10 20', 'set b width 100', 'undo', 'undo');
  assert.equal(h.snapshot(), encoded);
});

test('normalization preserves inheritance and resets a cancelling local scale', async () => {
  const h = new TestHarness();
  h.files.set(
    'nested.svg',
    '<svg><g id="outer" transform="scale(2)" stroke="black" stroke-width="3" font-size="20"><g id="inner" transform="scale(.5)"><text id="t" x="2" y="4">A</text></g><circle id="c" cx="10" cy="20" r="3"/></g></svg>',
  );
  await h.run('read nested.svg');
  assert.equal(h.editor.document().require('outer').attributes()['stroke-width'], '6');
  assert.equal(h.editor.document().require('inner').attributes()['stroke-width'], '3');
  assert.equal(h.editor.document().require('inner').attributes()['font-size'], '20');
  assert.equal(h.editor.document().require('c').attributes()['stroke-width'], undefined);
  assert.equal(h.editor.document().require('t').attributes()['font-size'], undefined);
  await h.run('set outer stroke-width 10');
  assert.equal(h.editor.document().require('c').attributes()['stroke-width'], undefined);
  await h.run('ungroup inner');
  assert.equal(h.editor.document().require('t').attributes()['stroke-width'], '3');
});

test('all six types normalize uniformly; stroke and text lengths scale during import', () => {
  const h = new TestHarness();
  const decoded = h.codec.decode(
    '<svg><g id="g" transform="scale(2) translate(10,20)"><rect id="r" x="1" y="2" width="3" height="4" stroke-width="2px"/><circle id="c" cx="1" cy="2" r="3"/><ellipse id="e" cx="1" cy="2" rx="3" ry="4"/><line id="l" x1="1" y1="2" x2="3" y2="4"/><text id="t" x="1" y="2" font-size="10px">A</text></g></svg>',
  );
  assert.deepEqual(decoded.document.require('r').geometry(), {
    x: '22',
    y: '44',
    width: '6',
    height: '8',
  });
  assert.equal(decoded.document.require('r').attributes()['stroke-width'], '4');
  assert.equal(decoded.document.require('c').geometry().r, '6');
  assert.equal(decoded.document.require('e').geometry().ry, '8');
  assert.equal(decoded.document.require('l').geometry().x2, '26');
  assert.equal(decoded.document.require('t').attributes()['font-size'], '20');
});

test('explicit inherit remains inherited after normalization, including whitespace', async () => {
  const h = new TestHarness();
  h.files.set(
    'inherit.svg',
    '<svg><g id="g" transform="scale(2)" stroke-width="3" font-size="20"><text id="t" stroke-width=" inherit " font-size="Inherit">A</text></g></svg>',
  );
  await h.run('read inherit.svg');
  assert.equal(h.editor.document().require('t').attributes()['stroke-width'], undefined);
  assert.equal(h.editor.document().require('t').attributes()['font-size'], undefined);
  await h.run('set g stroke-width 10');
  assert.equal(h.editor.document().require('t').attributes()['stroke-width'], undefined);
});

test('default text and stroke sizes are materialized when scaling has no explicit styles', () => {
  const h = new TestHarness();
  const document = h.codec.decode(
    '<svg><g id="g" transform="scale(2)"><text id="t">A</text></g></svg>',
  ).document;
  assert.equal(document.require('g').attributes()['font-size'], '32');
  assert.equal(document.require('g').attributes()['stroke-width'], '2');
  assert.equal(document.require('t').attributes()['font-size'], undefined);
});

for (const transform of [
  'rotate(30)',
  'matrix(1,0,0,1,0,0)',
  'scale(2,3)',
  'scale(-1)',
  'scale(0)',
  'translate(1,,2)',
  'translate(1,)',
  ',scale(2)',
  'scale(2),',
  'scale(NaN)',
  'translate(1) trailing',
  'scale(1e308) scale(2)',
]) {
  test(`invalid transform preserves document and history: ${transform}`, async () => {
    const h = new TestHarness();
    await h.run('init', 'create g existing');
    const before = h.snapshot();
    h.files.set('invalid.svg', `<svg><g id="g" transform="${transform}"/></svg>`);
    assert.match((await h.router.execute('read invalid.svg'))[0]!, /^error:/);
    assert.equal(h.snapshot(), before);
    await h.run('undo');
    assert.equal(h.editor.document().all().length, 0);
  });
}

test('unhandled length-sensitive attributes and relative font sizes fail explicitly under scaling', () => {
  const h = new TestHarness();
  assert.throws(
    () =>
      h.codec.decode(
        '<svg><g id="g" stroke-dasharray="2 3"><line id="l" transform="scale(2)"/></g></svg>',
      ),
    /unsupported scaled SVG attribute/,
  );
  assert.throws(
    () => h.codec.decode('<svg><text id="t" transform="scale(2)" font-size="2em">A</text></svg>'),
    /invalid number/,
  );
  assert.throws(
    () => h.codec.decode('<svg><rect id="r" rx="3" transform="scale(2)"/></svg>'),
    /unsupported scaled SVG attribute/,
  );
});
