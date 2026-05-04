import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { gaijiTable } from '../src/data/gaiji-table.js';

const SOURCE_URL = 'https://www.aozora.gr.jp/gaiji_chuki/gaiji_chuki.pdf';
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(SCRIPT_DIR, '../src/data/gaiji-shape-table.ts');
const PDFJS_DIR = resolve(SCRIPT_DIR, '../node_modules/pdfjs-dist');

type TextItem = {
  str: string;
  transform: number[];
};

type Candidate = {
  shape: string;
  value: string;
};

const ANNOTATION_PATTERN = /※［＃(.+?)］/u;
const ENTRY_PATTERN = /^(?:★\s*)?\d+．\s*(.*?)\s+※［＃/u;
const JIS_PATTERN = /第\s*[34]\s*水準\s*(\d)-(\d+)-(\d+)/u;
const UNICODE_PATTERN = /U\+([0-9A-Fa-f]+)/u;

function decodeUnicode(annotation: string): string | null {
  const unicodeMatch = UNICODE_PATTERN.exec(annotation);
  if (!unicodeMatch?.[1]) return null;

  const codepoint = Number.parseInt(unicodeMatch[1], 16);
  if (codepoint < 0 || codepoint > 0x10ffff) return null;

  return String.fromCodePoint(codepoint);
}

function decodeJis(annotation: string): string | null {
  const jisMatch = JIS_PATTERN.exec(annotation);
  if (!jisMatch) return null;

  const key = `${jisMatch[1]}-${jisMatch[2]}-${jisMatch[3]}`;
  return gaijiTable[key] ?? null;
}

function extractShape(annotation: string): string | null {
  const descriptor = annotation.split('、')[0]?.trim();
  if (!descriptor) return null;

  const shape = descriptor.replace(/[「」]/g, '').trim();
  return shape === '' ? null : shape;
}

function extractGlyph(line: string): string | null {
  const match = ENTRY_PATTERN.exec(line);
  const glyph = match?.[1]?.trim();

  if (!glyph || glyph.includes('→') || glyph.includes('入力可能')) return null;
  return glyph.replace(/\s+/g, '');
}

function extractCandidate(line: string): Candidate | null {
  const annotation = ANNOTATION_PATTERN.exec(line)?.[1];
  if (!annotation) return null;

  const shape = extractShape(annotation);
  if (!shape) return null;

  const value = decodeJis(annotation) ?? decodeUnicode(annotation) ?? extractGlyph(line);
  if (!value) return null;

  return { shape, value };
}

function toLines(items: TextItem[]): string[] {
  const rows = new Map<number, Array<{ x: number; text: string }>>();

  for (const item of items) {
    const y = Math.round(item.transform[5] ?? 0);
    const x = item.transform[4] ?? 0;
    const row = rows.get(y) ?? [];
    row.push({ x, text: item.str });
    rows.set(y, row);
  }

  return [...rows.entries()]
    .sort(([yA], [yB]) => yB - yA)
    .map(([, row]) =>
      row
        .sort((a, b) => a.x - b.x)
        .map((item) => item.text)
        .join('')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter((line) => line !== '');
}

async function loadPdfLines(): Promise<string[]> {
  const response = await fetch(SOURCE_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${SOURCE_URL}: ${response.status} ${response.statusText}`);
  }

  const data = new Uint8Array(await response.arrayBuffer());
  const document = await pdfjs.getDocument({
    data,
    cMapPacked: true,
    cMapUrl: `${PDFJS_DIR}/cmaps/`,
    disableFontFace: true,
    isEvalSupported: false,
    standardFontDataUrl: `${PDFJS_DIR}/standard_fonts/`,
    useWorkerFetch: false,
  }).promise;

  const lines: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const textContent = await page.getTextContent();
    lines.push(...toLines(textContent.items as TextItem[]));
  }

  return lines;
}

function buildShapeTable(candidates: Candidate[]): {
  entries: Array<[string, string]>;
  conflictCount: number;
  conflictExamples: Array<[string, string[]]>;
} {
  const valuesByShape = new Map<string, Set<string>>();

  for (const { shape, value } of candidates) {
    const values = valuesByShape.get(shape) ?? new Set<string>();
    values.add(value);
    valuesByShape.set(shape, values);
  }

  const entries: Array<[string, string]> = [];
  const conflictExamples: Array<[string, string[]]> = [];
  let conflictCount = 0;

  for (const [shape, values] of valuesByShape) {
    if (values.size === 1) {
      entries.push([shape, [...values][0] ?? '']);
      continue;
    }

    conflictCount += 1;
    if (conflictExamples.length < 10) {
      conflictExamples.push([shape, [...values]]);
    }
  }

  return {
    entries: entries.sort(([a], [b]) => a.localeCompare(b, 'ja')),
    conflictCount,
    conflictExamples,
  };
}

async function main() {
  const lines = await loadPdfLines();
  const candidates = lines.map(extractCandidate).filter((entry) => entry !== null);
  const { entries, conflictCount, conflictExamples } = buildShapeTable(candidates);

  const body = entries
    .map(([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)},`)
    .join('\n');

  const output = `// AUTO-GENERATED FILE - DO NOT EDIT.
// Regenerate with: pnpm build:gaiji-shape-table
// Source: ${SOURCE_URL}
// Conflicting shape descriptions are excluded so convertGaiji leaves ambiguous annotations unchanged.

export const gaijiShapeTable: Record<string, string> = {
${body}
};
`;

  await writeFile(OUTPUT_PATH, output);

  console.log(`Read ${lines.length} PDF text lines from ${SOURCE_URL}`);
  console.log(`Extracted ${candidates.length} shape candidates`);
  console.log(`Wrote ${entries.length} entries to ${OUTPUT_PATH}`);
  console.log(`Excluded ${conflictCount} conflicting shape descriptions`);
  for (const [shape, values] of conflictExamples) {
    console.log(`  ${shape}: ${values.join(', ')}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
