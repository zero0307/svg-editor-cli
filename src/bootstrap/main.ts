import { createReadStream } from 'node:fs';
import { ShapeFactory } from '../application/ShapeFactory.js';
import { SvgEditor } from '../application/SvgEditor.js';
import { CommandRouter } from '../cli/CommandRouter.js';
import { Repl } from '../cli/Repl.js';
import { LocalFileStore } from '../infrastructure/LocalFileStore.js';
import { XmlSvgCodec } from '../infrastructure/XmlSvgCodec.js';

const factory = new ShapeFactory();
const router = new CommandRouter(new SvgEditor(new LocalFileStore(), new XmlSvgCodec(factory)), factory);
const args = process.argv.slice(2);
try {
  if (args.length === 1 && args[0] === '--help') console.log(router.help().join('\n'));
  else if (args.length === 0 || (args.length === 2 && args[0] === '--script')) {
    const input = args.length ? createReadStream(args[1]!, { encoding: 'utf8' }) : process.stdin;
    const interactive = !args.length && Boolean(process.stdin.isTTY);
    const success = await new Repl(router).run(input, process.stdout, interactive);
    if (!success && !interactive) process.exitCode = 1;
  } else { console.error('error: usage: npm run cli -- [--script <file> | --help]'); process.exitCode = 1; }
} catch (error) {
  console.error(`error: ${args.length ? `cannot read script: ${args[1]}` : error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
