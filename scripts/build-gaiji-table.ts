import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE_URL = 'https://x0213.org/codetable/jisx0213-2004-std.txt';
const OUTPUT_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/gaiji-table.ts');

/**
 * jisx0213-2004-std.txt の各行は次の形式：
 *   3-XXYY\tU+CCCC[+CCCC]\t# comment
 * 先頭の `3-` は JIS X 0213 plane 1（第3水準）、`4-` は plane 2（第4水準）。
 * XX, YY は GL エンコーディングの 1 バイト目・2 バイト目（16進数）で、
 * それぞれ `区 + 0x20`、`点 + 0x20` の値を持つ。
 */
function parseLine(line: string): [string, string] | null {
  if (line.startsWith('#') || line.trim() === '') return null;

  const match = /^([34])-([0-9A-F]{2})([0-9A-F]{2})\t(U\+[0-9A-F]+(?:\+[0-9A-F]+)?)/.exec(line);
  if (!match) return null;

  const [, planePrefix, kuHex, tenHex, unicodeField] = match;
  const plane = planePrefix === '3' ? 1 : 2;
  const ku = Number.parseInt(kuHex, 16) - 0x20;
  const ten = Number.parseInt(tenHex, 16) - 0x20;

  const chars = unicodeField
    .replace(/^U\+/, '')
    .split('+')
    .map((part) => String.fromCodePoint(Number.parseInt(part, 16)))
    .join('');

  return [`${plane}-${ku}-${ten}`, chars];
}

async function main() {
  const response = await fetch(SOURCE_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${SOURCE_URL}: ${response.status} ${response.statusText}`);
  }
  const text = await response.text();

  const entries: Array<[string, string]> = [];
  for (const line of text.split('\n')) {
    const entry = parseLine(line);
    if (entry) entries.push(entry);
  }

  const body = entries
    .map(([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)},`)
    .join('\n');

  const output = `// AUTO-GENERATED FILE — DO NOT EDIT.
// Regenerate with: pnpm build:gaiji-table
// Source: ${SOURCE_URL}
// Key format: \`\${plane}-\${ku}-\${ten}\` (decimal kuten); plane 1 = JIS第3水準, plane 2 = JIS第4水準.

export const gaijiTable: Record<string, string> = {
${body}
};
`;

  await writeFile(OUTPUT_PATH, output);
  console.log(`Wrote ${entries.length} entries to ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
