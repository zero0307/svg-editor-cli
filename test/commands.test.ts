import test from 'node:test';
import assert from 'node:assert/strict';
import { TestHarness } from './TestHarness.js';

test('all six create types, optional presentation and create-in work', async () => {
  const h = new TestHarness();
  await h.run(
    'init',
    'create g g1',
    'create rect r 1 2 3 4 red in g1',
    'create circle c 5 6 7',
    'create ellipse e 1 2 3 4',
    'create line l 0 0 10 10 black',
    'create text t 20 30 "Hello world 中文" in g1',
  );
  assert.deepEqual(h.ids('g1'), ['r', 't']);
  assert.equal(h.editor.document().require('t').textContent(), 'Hello world 中文');
  assert.equal(h.editor.document().require('c').attributes().fill, undefined);
  assert.equal(h.editor.document().require('l').attributes().stroke, 'black');
  const tree = (await h.router.execute('tree')).join('\n');
  assert.match(tree, /svg \(800x600\)/);
  assert.match(tree, /rect#r  x=1 y=2 w=3 h=4 fill=red/);
  assert.match(tree, /│   └── text#t/);
  assert.match((await h.router.execute('show r')).join('\n'), /parent=g#g1/);
  assert.equal((await h.router.execute('tree g1'))[0], 'g#g1');
});

test('each edit is one undo unit and undo/redo round-trip exact structure', async () => {
  const h = new TestHarness();
  await h.run(
    'init',
    'create g outer',
    'create g inner in outer',
    'create rect a 1 2 3 4 red in outer',
    'create circle b 5 6 7 in outer',
    'create text t 10 20 "old" in inner',
  );
  const edits = [
    'create ellipse e 2 3 4 5 in inner',
    'move outer 4 5',
    'scale outer .5',
    'set t text "new value"',
    'set outer fill blue',
    'group pair b a',
    'ungroup pair',
    'addto inner a',
    'front inner',
    'back inner',
    'delete inner',
  ];
  for (const line of edits) {
    const before = h.snapshot();
    await h.run(line);
    const after = h.snapshot();
    await h.run('undo');
    assert.equal(h.snapshot(), before, `undo ${line}`);
    await h.run('redo');
    assert.equal(h.snapshot(), after, `redo ${line}`);
  }
});

test('group preserves paint order and ungroup occupies the former slot', async () => {
  const h = new TestHarness();
  await h.run(
    'init',
    'create g outer',
    'create rect a 0 0 1 1 in outer',
    'create rect middle 0 0 1 1 in outer',
    'create rect b 0 0 1 1 in outer',
    'group pair b a',
  );
  assert.deepEqual(h.ids('outer'), ['pair', 'middle']);
  assert.deepEqual(h.ids('pair'), ['a', 'b']);
  await h.run('ungroup pair');
  assert.deepEqual(h.ids('outer'), ['a', 'b', 'middle']);
  await h.run('undo');
  assert.deepEqual(h.ids('outer'), ['pair', 'middle']);
});

test('cross-parent group uses lowest common ancestor and document order', async () => {
  const h = new TestHarness();
  await h.run(
    'init',
    'create g outer',
    'create g left in outer',
    'create g right in outer',
    'create circle a 0 0 1 in left',
    'create circle b 0 0 1 in right',
    'group pair b a',
  );
  assert.deepEqual(h.ids('outer'), ['pair', 'left', 'right']);
  assert.deepEqual(h.ids('pair'), ['a', 'b']);
  assert.deepEqual(h.ids('left'), []);
  assert.deepEqual(h.ids('right'), []);
});

test('front/back change only sibling paint order; reparent appends', async () => {
  const h = new TestHarness();
  await h.run(
    'init',
    'create g group',
    'create circle a 0 0 1 in group',
    'create circle b 0 0 1 in group',
    'create circle c 0 0 1 in group',
    'front a',
  );
  assert.deepEqual(h.ids('group'), ['b', 'c', 'a']);
  await h.run('back a');
  assert.deepEqual(h.ids('group'), ['a', 'b', 'c']);
  await h.run('addto group a');
  assert.deepEqual(h.ids('group'), ['b', 'c', 'a']);
  assert.deepEqual(h.ids(), ['group']);
});

test('successful new edit discards redo, queries and failed edits preserve redo', async () => {
  const h = new TestHarness();
  await h.run(
    'init',
    'create circle c 1 2 3',
    'move c 10 0',
    'undo',
    'tree',
    'show c',
    'help',
    'canvas',
  );
  assert.deepEqual(await h.router.execute('set c r -1'), ['error: r must be non-negative']);
  await h.run('redo');
  assert.equal(h.editor.document().require('c').geometry().cx, '11');
  await h.run('undo', 'set c fill red');
  assert.deepEqual(await h.router.execute('redo'), ['error: nothing to redo']);
});

test('IO barriers block both stacks; a successful edit starts fresh history', async () => {
  for (const io of ['save example.svg', 'canvas 100 200', 'init 400 300', 'read loaded.svg']) {
    const h = new TestHarness();
    h.files.set('loaded.svg', '<svg width="10" height="20"><circle id="loaded" r="1"/></svg>');
    await h.run('init', 'create circle c 1 2 3', 'move c 10 0', 'undo', io);
    assert.deepEqual(await h.router.execute('undo'), ['error: undo not allowed after io command']);
    assert.deepEqual(await h.router.execute('redo'), ['error: undo not allowed after io command']);
    assert.deepEqual(await h.router.execute('move missing 1 2'), ['error: no such shape: missing']);
    assert.deepEqual(await h.router.execute('undo'), ['error: undo not allowed after io command']);
    const barrier = h.snapshot();
    await h.run('create g fresh', 'undo');
    assert.equal(h.snapshot(), barrier);
    assert.deepEqual(await h.router.execute('undo'), ['error: nothing to undo']);
  }
});

test('failed IO preserves document, history and remembered save path', async () => {
  const h = new TestHarness();
  await h.run('init', 'save original.svg', 'create circle c 1 2 3');
  const before = h.snapshot();
  for (const command of ['read missing.svg', 'save readonly.svg', 'canvas 1 -1', 'init -1 1']) {
    assert.match((await h.router.execute(command))[0]!, /^error:/);
    assert.equal(h.snapshot(), before);
  }
  h.files.set('bad.svg', '<svg><circle id="a"/><circle id="a"/></svg>');
  assert.match((await h.router.execute('read bad.svg'))[0]!, /^error:/);
  await h.run('undo');
  assert.equal(h.editor.document().all().length, 0);
  await h.run('redo', 'save');
  assert.equal(h.files.get('original.svg'), before);
});

test('errors are atomic across geometry, ids, hierarchy, parsing and cycles', async () => {
  const h = new TestHarness();
  await h.run(
    'init',
    'create g outer',
    'create g inner in outer',
    'create rect r 1 2 3 4 in inner',
    'create circle c 2 3 4',
  );
  const before = h.snapshot();
  const cases: readonly [string, string][] = [
    ['create rect r 0 0 1 1', 'id already exists: r'],
    ['create box b 0 0 1 1 "title"', 'unknown shape type: box (is the plugin loaded?)'],
    ['create rect x 0 0 1 1 in missing', 'no such container: missing'],
    ['create rect x 0 0 1 1 in c', 'not a container: c'],
    ['delete missing', 'no such shape: missing'],
    ['scale outer 0', 'scale factor must be positive'],
    ['set r nonsense 1', 'unknown attribute: nonsense'],
    ['set r width -1', 'width must be non-negative'],
    ['group bad r outer', 'cannot group a container into its own descendant: outer'],
    ['group bad r r', 'duplicate shape in group'],
    ['group bad r missing', 'no such shape: missing'],
    ['addto inner outer', 'cannot move a container into its own descendant: outer'],
    ['addto outer outer', 'cannot move a container into its own descendant: outer'],
    ['ungroup outer', 'cannot ungroup top-level container: outer'],
    ['ungroup r', 'not a container: r'],
    ['move r NaN 2', 'invalid number for argument 2: NaN'],
    ['set r fill "unterminated', 'unterminated quoted argument'],
    ['unknown', 'unknown command: unknown'],
  ];
  for (const [command, error] of cases) {
    assert.deepEqual(await h.router.execute(command), [`error: ${error}`]);
    assert.equal(h.snapshot(), before, command);
  }
  await h.run('undo');
  assert.equal(h.editor.document().find('c'), undefined);
});

test('overflow partway through recursive group mutation leaves all children intact', async () => {
  const h = new TestHarness();
  await h.run('init', 'create g g', 'create circle a 1 2 3 in g', 'create circle b 1e308 2 3 in g');
  const before = h.snapshot();
  assert.match((await h.router.execute('scale g 100'))[0]!, /must be finite/);
  assert.equal(h.snapshot(), before);
  await h.run('undo');
  assert.equal(h.editor.document().find('b'), undefined);
});

test('group presentation uses SVG inheritance; ungroup preserves explicit inherited values', async () => {
  const h = new TestHarness();
  await h.run(
    'init',
    'create g outer',
    'create g inner in outer',
    'create rect r 0 0 1 1 in inner',
    'create circle c 0 0 1 blue in inner',
    'set inner fill red',
  );
  assert.equal(h.editor.document().require('r').attributes().fill, undefined);
  await h.run('ungroup inner');
  assert.equal(h.editor.document().require('r').attributes().fill, 'red');
  assert.equal(h.editor.document().require('c').attributes().fill, 'blue');
});

test('before initialization all operational commands fail, help and comments work', async () => {
  const h = new TestHarness();
  assert.equal(
    (await h.router.execute('help')).some((line) => line.startsWith('create')),
    true,
  );
  assert.deepEqual(await h.router.execute(' # comment'), []);
  for (const command of ['save', 'canvas', 'tree', 'show c', 'undo', 'redo', 'create g g'])
    assert.deepEqual(await h.router.execute(command), [
      "error: no document. use 'init' or 'read' first",
    ]);
});

test('successful CLI edits always remain within the readable SVG nesting limit', async () => {
  const h = new TestHarness();
  await h.run('init', 'create circle leaf 0 0 1');
  for (let i = 1; i <= 128; i++) await h.run(`create g g${i}${i === 1 ? '' : ` in g${i - 1}`}`);
  const before = h.snapshot();
  for (const command of [
    'create circle deep 0 0 1 in g128',
    'group wrapper g128',
    'addto g128 leaf',
  ]) {
    assert.deepEqual(await h.router.execute(command), ['error: SVG nesting exceeds 128 levels']);
    assert.equal(h.snapshot(), before);
  }
  assert.equal(h.codec.encode(h.codec.decode(before).document), before);
});

test('history retains the most recent 100 edits', async () => {
  const h = new TestHarness();
  await h.run('init', 'create circle c 0 0 1');
  for (let i = 0; i < 105; i++) await h.run('move c 1 0');
  for (let i = 0; i < 100; i++) await h.run('undo');
  assert.equal(h.editor.document().require('c').geometry().cx, '5');
  assert.deepEqual(await h.router.execute('undo'), ['error: nothing to undo']);
});
