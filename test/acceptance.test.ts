import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Group } from '../src/domain/shapes/Group.js';
import { TestHarness } from './TestHarness.js';

test('course transcript: save barrier, invalid ancestor grouping, restore and external import', async () => {
  const h = new TestHarness();
  await h.run(
    'init 800 600',
    'create rect bg 0 0 800 600 #ffffff',
    'create text title 20 40 "My Diagram"',
    'create circle c1 100 100 20 red',
    'create rect box 200 80 60 60 #3366ff',
    'group markers c1 box',
  );
  assert.deepEqual(await h.router.execute('tree'), [
    'svg (800x600)',
    '├── rect#bg  x=0 y=0 w=800 h=600 fill=#ffffff',
    '├── text#title  (20,40) "My Diagram"',
    '└── g#markers',
    '    ├── circle#c1  cx=100 cy=100 r=20 fill=red',
    '    └── rect#box  x=200 y=80 w=60 h=60 fill=#3366ff',
  ]);
  await h.run('move c1 30 0', 'undo', 'redo', 'set title text "My Diagram v2"', 'undo');
  assert.equal(h.editor.document().require('c1').geometry().cx, '130');
  assert.equal(h.editor.document().require('title').textContent(), 'My Diagram');
  assert.deepEqual(await h.router.execute('group bad c1 markers'), [
    'error: cannot group a container into its own descendant: markers',
  ]);
  await h.run('delete box', 'undo');
  assert.deepEqual(h.ids('markers'), ['c1', 'box']);
  assert.deepEqual(await h.router.execute('save demo.svg'), ['saved to demo.svg (5 elements)']);
  assert.deepEqual(await h.router.execute('undo'), ['error: undo not allowed after io command']);
  h.files.set('other.svg', await readFile('examples/other.svg', 'utf8'));
  assert.deepEqual(await h.router.execute('read other.svg'), [
    'warning: assigned id rect1 to unnamed <rect>',
    'read other.svg (7 elements)',
  ]);
  assert.equal(h.editor.document().width, 400);
  assert.deepEqual(h.ids('g1'), ['r2', 'c2']);
});

test('course flowchart example replays and exports eight elements', async () => {
  const h = new TestHarness();
  const script = await readFile('examples/flowchart.commands', 'utf8');
  await h.run(...script.split(/\r?\n/));
  assert.equal(h.editor.document().all().length, 8);
  assert.deepEqual(h.ids('node2'), ['process', 'process-label']);
  assert.equal(h.editor.document().require('process').geometry().y, '100');
  assert.equal(h.editor.document().require('process-label').textContent(), '处理数据 v2');
  const saved = h.files.get('examples/flowchart.svg')!;
  assert.equal(h.codec.encode(h.codec.decode(saved).document), saved);
});

for (const seed of [7, 42, 2026, 65535]) {
  test(`deterministic edit sequence preserves complete undo/redo history (seed ${seed})`, async () => {
    const h = new TestHarness();
    await h.run(
      'init',
      'create g outer',
      'create g inner in outer',
      'create rect a 1 2 3 4 in outer',
      'create circle b 5 6 7 in inner',
      'save baseline.svg',
    );
    let state = seed;
    const random = (max: number): number => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state % max;
    };
    const snapshots = [h.snapshot()];
    for (let step = 0; step < 60; step++) {
      const document = h.editor.document();
      const all = document.all();
      const shape = all[random(all.length)]!;
      const action = random(7);
      let command: string;
      if (action === 0) command = `move ${shape.id} ${random(21) - 10} ${random(21) - 10}`;
      else if (action === 1) command = `scale ${shape.id} ${random(2) ? 2 : '.5'}`;
      else if (action === 2) command = `set ${shape.id} fill ${random(2) ? 'red' : 'blue'}`;
      else if (action === 3) command = `front ${shape.id}`;
      else if (action === 4) command = `back ${shape.id}`;
      else if (action === 5) command = `create rect item${step} ${step} 0 10 20 in outer`;
      else {
        const siblingGroups = all.filter(
          (node) => node instanceof Group && node.children().length > 0,
        );
        const parent = siblingGroups[random(siblingGroups.length)]!;
        command = `group group${step} ${parent
          .children()
          .slice(0, 2)
          .map((node) => node.id)
          .join(' ')}`;
      }
      await h.run(command);
      snapshots.push(h.snapshot());
      assert.equal(h.codec.encode(h.codec.decode(h.snapshot()).document), h.snapshot());
    }
    for (let i = snapshots.length - 2; i >= 0; i--) {
      await h.run('undo');
      assert.equal(h.snapshot(), snapshots[i]);
    }
    assert.deepEqual(await h.router.execute('undo'), ['error: nothing to undo']);
    for (let i = 1; i < snapshots.length; i++) {
      await h.run('redo');
      assert.equal(h.snapshot(), snapshots[i]);
    }
  });
}
