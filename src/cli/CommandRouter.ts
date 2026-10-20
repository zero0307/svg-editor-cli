import { DomainError } from '../domain/DomainError.js';
import type { SvgEditor } from '../application/SvgEditor.js';
import type { ShapeFactory } from '../application/ShapeFactory.js';
import { CreateCommand } from '../application/commands/CreateCommand.js';
import { DeleteCommand } from '../application/commands/DeleteCommand.js';
import { MoveCommand } from '../application/commands/MoveCommand.js';
import { ScaleCommand } from '../application/commands/ScaleCommand.js';
import { SetCommand } from '../application/commands/SetCommand.js';
import { GroupCommand } from '../application/commands/GroupCommand.js';
import { UngroupCommand } from '../application/commands/UngroupCommand.js';
import { AddToCommand } from '../application/commands/AddToCommand.js';
import { FrontCommand } from '../application/commands/FrontCommand.js';
import { BackCommand } from '../application/commands/BackCommand.js';
import { CommandArguments } from './CommandArguments.js';
import { ShapePresenter } from './ShapePresenter.js';
import { Tokenizer } from './Tokenizer.js';

interface Entry {
  readonly usage: string;
  readonly run: (args: CommandArguments) => string | readonly string[] | Promise<string | readonly string[]>;
}

/** Name dispatch #1: CLI syntax lives here; shape semantics live in domain classes. */
export class CommandRouter {
  private readonly tokenizer = new Tokenizer();
  private readonly presenter = new ShapePresenter();
  private readonly entries = new Map<string, Entry>();
  constructor(private readonly editor: SvgEditor, factory: ShapeFactory) {
    this.register('init', 'init [w] [h]', a => { a.requireCount(0, 2); return editor.init(a.length ? a.number(0) : 800, a.length > 1 ? a.number(1) : 600); });
    this.register('read', 'read <file.svg>', a => { a.requireCount(1); return editor.read(a.value(0)); });
    this.register('save', 'save [file.svg]', a => { a.requireCount(0, 1); return editor.save(a.length ? a.value(0) : undefined); });
    this.register('canvas', 'canvas [w h]', a => { if (a.length !== 0) a.requireCount(2); return a.length ? editor.canvas(a.number(0), a.number(1)) : editor.canvas(); });
    this.register('create', 'create <type> <id> [params...] [in <containerId>]', a => { a.requireCount(2, Infinity); const suffix = a.containerSuffix(); return editor.edit(new CreateCommand(factory, a.value(0), a.value(1), suffix.args, suffix.containerId)); });
    this.register('delete', 'delete <id>', a => { a.requireCount(1); return editor.edit(new DeleteCommand(a.value(0))); });
    this.register('move', 'move <id> <dx> <dy>', a => { a.requireCount(3); return editor.edit(new MoveCommand(a.value(0), a.number(1), a.number(2))); });
    this.register('scale', 'scale <id> <factor>', a => { a.requireCount(2); return editor.edit(new ScaleCommand(a.value(0), a.number(1))); });
    this.register('set', 'set <id> <attr> <value>', a => { a.requireCount(3); return editor.edit(new SetCommand(a.value(0), a.value(1), a.value(2))); });
    this.register('group', 'group <newGid> <id1> <id2>...', a => { a.requireCount(2, Infinity); return editor.edit(new GroupCommand(a.value(0), a.values(1))); });
    this.register('ungroup', 'ungroup <gid>', a => { a.requireCount(1); return editor.edit(new UngroupCommand(a.value(0))); });
    this.register('addto', 'addto <gid> <id>', a => { a.requireCount(2); return editor.edit(new AddToCommand(a.value(0), a.value(1))); });
    this.register('front', 'front <id>', a => { a.requireCount(1); return editor.edit(new FrontCommand(a.value(0))); });
    this.register('back', 'back <id>', a => { a.requireCount(1); return editor.edit(new BackCommand(a.value(0))); });
    this.register('tree', 'tree [id]', a => { a.requireCount(0, 1); return this.presenter.tree(editor.document(), a.length ? a.value(0) : undefined); });
    this.register('show', 'show <id>', a => { a.requireCount(1); return this.presenter.show(editor.document(), a.value(0)); });
    this.register('undo', 'undo', a => { a.requireCount(0); return editor.undo(); });
    this.register('redo', 'redo', a => { a.requireCount(0); return editor.redo(); });
    this.register('help', 'help', a => { a.requireCount(0); return this.help(); });
  }
  private register(name: string, usage: string, run: Entry['run']): void { this.entries.set(name, { usage, run }); }
  help(): readonly string[] {
    return [
      ...[...this.entries.values()].map(entry => entry.usage),
      '', 'Types:',
      '  rect <id> <x> <y> <w> <h> [fill]', '  circle <id> <cx> <cy> <r> [fill]',
      '  ellipse <id> <cx> <cy> <rx> <ry> [fill]', '  line <id> <x1> <y1> <x2> <y2> [stroke]',
      '  text <id> <x> <y> "content"', '  g <id>',
      'Quote arguments containing spaces. Lines starting with # are comments.',
      'End input with Ctrl+D (Unix) or Ctrl+Z then Enter (Windows).',
    ];
  }
  async execute(line: string): Promise<readonly string[]> {
    try {
      const tokens = this.tokenizer.tokenize(line); if (!tokens.length) return [];
      const name = tokens[0]!.value; const entry = this.entries.get(name);
      if (!entry) throw new DomainError(`unknown command: ${name}`);
      // All known commands except init/read/help require an existing document.
      if (name !== 'init' && name !== 'read' && name !== 'help') this.editor.document();
      const result = await entry.run(new CommandArguments(tokens.slice(1), entry.usage));
      return typeof result === 'string' ? [result] : result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return [`error: ${message.replace(/[\r\n]+/g, ' ')}`];
    }
  }
}
