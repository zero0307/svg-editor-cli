import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import { ShapeFactory } from '../dist/src/application/ShapeFactory.js';
import { XmlSvgCodec } from '../dist/src/infrastructure/XmlSvgCodec.js';

// Local rendering only: no browser, preview server, remote fonts or image loading.
const codec = new XmlSvgCodec(new ShapeFactory());
const directory = 'artifacts/visual';
await mkdir(directory, { recursive: true });
const candidateFonts = [
  'C:/Windows/Fonts/msyh.ttc',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
];
const fontFiles = candidateFonts.filter((file) => existsSync(file));
const options = {
  background: 'white',
  font: {
    loadSystemFonts: fontFiles.length === 0,
    fontFiles,
    defaultFontFamily: process.platform === 'win32' ? 'Microsoft YaHei' : 'DejaVu Sans',
    defaultFontSize: 16,
  },
};
const render = (source) => new Resvg(source, options).render();
const source = await readFile('examples/transforms.svg', 'utf8');
const normalized = codec.encode(codec.decode(source).document);
const originalImage = render(source);
const normalizedImage = render(normalized);
assert.equal(originalImage.width, normalizedImage.width);
assert.equal(originalImage.height, normalizedImage.height);
let differingChannels = 0;
let totalDifference = 0;
const originalPixels = originalImage.pixels;
const normalizedPixels = normalizedImage.pixels;
for (let i = 0; i < originalPixels.length; i++) {
  const difference = Math.abs(originalPixels[i] - normalizedPixels[i]);
  if (difference) differingChannels++;
  totalDifference += difference;
}
await writeFile(`${directory}/transforms-original.png`, originalImage.asPng());
await writeFile(`${directory}/transforms-normalized.png`, normalizedImage.asPng());
await writeFile(`${directory}/transforms-normalized.svg`, normalized);
const report = {
  source: 'examples/transforms.svg',
  sourceSha256: createHash('sha256').update(source).digest('hex'),
  renderer: 'resvg-js',
  width: originalImage.width,
  height: originalImage.height,
  differingChannels,
  meanAbsoluteChannelDifference: totalDifference / originalPixels.length,
};
await writeFile(`${directory}/report.json`, `${JSON.stringify(report, null, 2)}\n`);
for (const name of ['flowchart', 'history']) {
  const image = render(await readFile(`examples/${name}.svg`, 'utf8'));
  await writeFile(`${directory}/${name}.png`, image.asPng());
}
console.log(JSON.stringify(report, null, 2));
assert.equal(
  differingChannels,
  0,
  'Import normalization changed rendered pixels; inspect artifacts/visual',
);
console.log('Offline visual verification passed: original and normalized SVG render identically.');
