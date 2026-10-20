import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { Readable, Writable } from 'node:stream';
import { Tokenizer } from '../src/cli/Tokenizer.js';
import { Repl } from '../src/cli/Repl.js';
import { LocalFileStore } from '../src/infrastructure/LocalFileStore.js';
import { TestHarness } from './TestHarness.js';

test('tokenizer supports empty quoted text, literal paths, escaped quotes, colors and comments', () => {
  const tokenizer = new Tokenizer();
  assert.deepEqual(tokenizer.tokenize('  # comment'), []);
  assert.deepEqual(
    tokenizer.tokenize('set t text ""').map((token) => token.value),
    ['set', 't', 'text', ''],
  );
  assert.deepEqual(
    tokenizer.tokenize('read "C:\\Users\\DELL\\a b.svg"').map((token) => token.value),
    ['read', 'C:\\Users\\DELL\\a b.svg'],
  );
  assert.deepEqual(
    tokenizer.tokenize('set t text "say \\"hi\\""').map((token) => token.value),
    ['set', 't', 'text', 'say "hi"'],
  );
  assert.equal(tokenizer.tokenize('set r fill #abc').at(-1)!.value, '#abc');
  assert.throws(() => tokenizer.tokenize('set t text "a"b'), /whitespace/);
  assert.throws(() => tokenizer.tokenize('set t text a"b'), /quote/);
});

test('quoted in text is not a container clause; empty and escaped text survives', async () => {
  const h = new TestHarness();
  await h.run('init', 'create text t 1 2 "in"', 'set t text ""');
  assert.equal(h.editor.document().require('t').textContent(), '');
  await h.run('create g g', 'create text t2 1 2 "in" in g');
  assert.deepEqual(h.ids('g'), ['t2']);
});

test('bad argument counts produce one-line errors without mutations', async () => {
  const h = new TestHarness();
  await h.run('init');
  for (const command of [
    'init 1 2 3',
    'canvas 1',
    'read',
    'save a b',
    'create',
    'move c 1',
    'undo extra',
    'show a b',
    'help extra',
    'create rect r 1 2 3',
    'create g g extra',
  ]) {
    const before = h.snapshot();
    const output = await h.router.execute(command);
    assert.equal(output.length, 1);
    assert.match(output[0]!, /^error:/);
    assert.equal(h.snapshot(), before);
  }
});

test('REPL processes input serially, continues after errors and emits prompt only interactively', async () => {
  const h = new TestHarness();
  let output = '';
  const sink = new Writable({
    write(chunk, _encoding, callback) {
      output += chunk.toString();
      callback();
    },
  });
  const success = await new Repl(h.router).run(
    Readable.from(['init\ncreate circle c 1 2 3\nmove missing 1 2\nmove c 10 0\ntree\n']),
    sink,
    false,
  );
  assert.equal(success, false);
  assert.doesNotMatch(output, /svg>/);
  assert.match(output, /cx=11 cy=2 r=3/);
  output = '';
  await new Repl(h.router).run(Readable.from(['help\n']), sink, true);
  assert.match(output, /^svg-editor 1\.0/);
  assert.match(output, /svg> /);
});

test('real filesystem writes atomically, replaces a file and cleans failed temporaries', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'svg-editor-'));
  try {
    const store = new LocalFileStore();
    const target = join(directory, '中文 file.svg');
    await store.write(target, 'first');
    await store.write(target, 'second');
    assert.equal(await store.read(target), 'second');
    await assert.rejects(() => store.read(join(directory, 'missing')), /cannot read file/);
    await assert.rejects(() => store.write(directory, 'bad target'), /cannot write file/);
    await assert.rejects(
      () => store.write(join(directory, 'missing', 'a.svg'), 'x'),
      /cannot write file/,
    );
    assert.deepEqual(await readdir(directory), ['中文 file.svg']);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('compiled executable supports pipes, scripts with spaces, help and failure exit codes', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'svg-cli-'));
  const entry = resolve('dist/src/bootstrap/main.js');
  try {
    const script = join(directory, 'demo commands.txt');
    const svg = join(directory, 'result.svg');
    await writeFile(
      script,
      `# script\ninit 400 300\ncreate text t 10 20 "Hello world"\nsave "${svg.replace(/\\/g, '/')}"\n`,
    );
    const run = spawnSync(process.execPath, [entry, '--script', script], { encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr + run.stdout);
    assert.match(await readFile(svg, 'utf8'), /Hello world/);
    const pipe = spawnSync(process.execPath, [entry], {
      input: 'init\ncreate g g\nunknown\ntree\n',
      encoding: 'utf8',
    });
    assert.equal(pipe.status, 1);
    assert.match(pipe.stdout, /g#g/);
    assert.doesNotMatch(pipe.stdout, /svg>/);
    assert.equal(spawnSync(process.execPath, [entry, '--help']).status, 0);
    assert.equal(spawnSync(process.execPath, [entry, '--bad']).status, 1);
    const missing = spawnSync(process.execPath, [entry, '--script', join(directory, 'missing')], {
      encoding: 'utf8',
    });
    assert.equal(missing.status, 1);
    assert.match(missing.stderr, /cannot read script/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
