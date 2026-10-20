import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('src');
const allowed = {
  domain: new Set(['domain']),
  application: new Set(['application', 'domain']),
  cli: new Set(['cli', 'application', 'domain']),
  infrastructure: new Set(['infrastructure', 'application', 'domain']),
  bootstrap: new Set(['bootstrap', 'cli', 'application', 'infrastructure', 'domain']),
};
const failures = [];
const files = (await readdir(root, { recursive: true })).filter((file) => file.endsWith('.ts'));
let edges = 0;
for (const file of files) {
  const source = await readFile(path.join(root, file), 'utf8');
  const layer = file.split(path.sep)[0];
  const classes = [...source.matchAll(/export\s+(?:abstract\s+)?class\s+(\w+)/g)].map(
    (match) => match[1],
  );
  if (classes.length > 1 || (classes.length === 1 && path.basename(file, '.ts') !== classes[0]))
    failures.push(`${file}: one class per file; filename must match`);
  for (const [, dependency] of source.matchAll(
    /(?:import\s[\s\S]*?from\s*|import\s*)['"]([^'"]+)['"]/g,
  )) {
    if (!dependency.startsWith('.')) {
      if (layer === 'domain' || layer === 'application')
        failures.push(`${file}: forbidden external dependency ${dependency}`);
      continue;
    }
    const target = path
      .relative(root, path.resolve(root, path.dirname(file), dependency))
      .split(path.sep)[0];
    edges++;
    if (!allowed[layer]?.has(target)) failures.push(`${file}: ${layer} -> ${target} is forbidden`);
  }
  if (/switch\s*\([^)]*\b(?:tag|type)\b/.test(source))
    failures.push(`${file}: tag/type switch is forbidden`);
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else
  console.log(
    `Architecture check passed: ${files.length} files, ${edges} internal imports, matching class filenames.`,
  );
