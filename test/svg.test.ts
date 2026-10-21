import test from 'node:test';
import assert from 'node:assert/strict';
import { TestHarness } from './TestHarness.js';

test('SVG round-trip preserves six types, styles, order, nesting and escaped text', async () => {
  const h = new TestHarness();
  await h.run(
    'init 400 300',
    'create g g',
    'create rect r 1.25 -2 30 40 #abc in g',
    'create circle c 2 3 4 red',
    'create ellipse e 4 5 6 7',
    'create line l 0 1 2 3 black',
    'create text t 20 30 "中文 <&> \\"quoted\\"" in g',
  );
  // Set through the use-case rather than shell quoting for a literal XML edge case.
  await h.run('set t text "中文 <&> \\"quoted\\""');
  const encoded = h.snapshot();
  assert.match(encoded, /&lt;&amp;&gt;/);
  const decoded = h.codec.decode(encoded);
  assert.equal(h.codec.encode(decoded.document), encoded);
  assert.deepEqual(decoded.warnings, []);
});

test('missing ids skip every explicit id, including later and nested elements', () => {
  const h = new TestHarness();
  const result = h.codec.decode(
    '<svg width="10px" height="20px"><rect/><g><rect id="rect1"/><rect/></g><g id="g1"/></svg>',
  );
  assert.deepEqual(
    result.document.all().map((shape) => shape.id),
    ['rect2', 'g2', 'rect1', 'rect3', 'g1'],
  );
  assert.deepEqual(result.warnings, [
    'warning: assigned id rect2 to unnamed <rect>',
    'warning: assigned id g2 to unnamed <g>',
    'warning: assigned id rect3 to unnamed <rect>',
  ]);
});

test('import preserves text typography, custom metadata and degrades box to g', () => {
  const h = new TestHarness();
  const decoded = h.codec.decode(
    '<svg width="100" height="100"><g id="n" data-kind="box"><text id="t" x="5" y="6" text-anchor="middle" font-size="16"><![CDATA[A < B & C]]></text></g></svg>',
  );
  assert.equal(decoded.document.require('n').tag, 'g');
  assert.equal(decoded.document.require('t').textContent(), 'A < B & C');
  assert.equal(decoded.document.require('t').attributes()['font-size'], '16');
  assert.match(h.codec.encode(decoded.document), /data-kind="box"/);
});

const invalidSvg = [
  [
    'prefixed attributes',
    '<svg xmlns:xlink="http://www.w3.org/1999/xlink"><rect id="r" xlink:href="#other"/></svg>',
  ],
  ['malformed', '<svg><rect></svg>'],
  ['duplicate ids', '<svg><rect id="r"/><circle id="r"/></svg>'],
  ['unknown type', '<svg><path id="p" d="M0 0"/></svg>'],
  ['wrong root', '<html/>'],
  ['wrong namespace', '<svg xmlns="urn:wrong"/>'],
  ['nested namespace', '<svg><rect xmlns="urn:wrong"/></svg>'],
  ['unsupported transforms', '<svg><g id="g" transform="rotate(30)"/></svg>'],
  ['external CSS', '<?xml-stylesheet href="external.css" type="text/css"?><svg/>'],
  ['nested CSS instruction', '<svg><g id="g"><?xml-stylesheet href="external.css"?></g></svg>'],
  ['CSS', '<svg><rect id="r" style="fill:red"/></svg>'],
  ['root styles', '<svg fill="red"/>'],
  ['tspan', '<svg><text id="t"><tspan>a</tspan></text></svg>'],
  ['unexpected text', '<svg>hello</svg>'],
  ['group text', '<svg><g id="g">hello</g></svg>'],
  ['different coordinates', '<svg width="100" height="100" viewBox="10 10 100 100"/>'],
  ['mismatched dimensions', '<svg width="100" height="100" viewBox="0 0 50 50"/>'],
  ['percent sizes', '<svg width="100%" height="100"/>'],
  ['negative size', '<svg><circle id="c" r="-1"/></svg>'],
  ['DTD', '<!DOCTYPE svg [<!ENTITY x "hello">]><svg/>'],
  ['events', '<svg><rect id="r" onclick="run()"/></svg>'],
] as const;
for (const [name, source] of invalidSvg) {
  test(`invalid/unsupported SVG is rejected atomically: ${name}`, async () => {
    const h = new TestHarness();
    await h.run('init', 'create circle existing 1 2 3');
    const before = h.snapshot();
    h.files.set('invalid.svg', source);
    const output = await h.router.execute('read invalid.svg');
    assert.equal(output.length, 1);
    assert.match(output[0]!, /^error:/);
    assert.equal(h.snapshot(), before);
    await h.run('undo');
    assert.equal(h.editor.document().all().length, 0);
  });
}

test('ungroup preserves inherited text styles without spreading group metadata', async () => {
  const h = new TestHarness();
  h.files.set(
    'styled.svg',
    '<svg><g id="outer"><g id="inner" fill="red" font-size="16" data-kind="box"><text id="t" x="1" y="2">label</text></g></g></svg>',
  );
  await h.run('read styled.svg', 'ungroup inner');
  const attributes = h.editor.document().require('t').attributes();
  assert.equal(attributes.fill, 'red');
  assert.equal(attributes['font-size'], '16');
  assert.equal(attributes['data-kind'], undefined);
  assert.match((await h.router.execute('tree'))[2]!, /fill=red/);
});

test('nesting limit fails before traversal can exhaust the call stack', () => {
  const h = new TestHarness();
  assert.throws(
    () => h.codec.decode(`<svg>${'<g>'.repeat(129)}${'</g>'.repeat(129)}</svg>`),
    /128 levels/,
  );
});

test('successful read publishes warnings once; save without path remembers read target', async () => {
  const h = new TestHarness();
  h.files.set('a.svg', '<svg width="400" height="300"><rect/></svg>');
  assert.deepEqual(await h.router.execute('read a.svg'), [
    'warning: assigned id rect1 to unnamed <rect>',
    'read a.svg (1 elements)',
  ]);
  await h.run('move rect1 5 6', 'save');
  assert.match(h.files.get('a.svg')!, /x="5" y="6"/);
  await h.run('init');
  assert.deepEqual(await h.router.execute('save'), ['error: no file path. use save <file.svg>']);
});
