import { gaijiShapeTable } from './data/gaiji-shape-table.js';
import { gaijiTable } from './data/gaiji-table.js';

const ANNOTATION_PATTERN = /※［＃[^］\r\n]*］/gu;
const JIS_PATTERN = /第[34]水準([12])-(\d+)-(\d+)/u;
const PLANE_CELL_PATTERN = /(?:面区点番号\s*|、\s*)([12])-(\d{1,2})-(\d{1,2})(?=[、］])/u;
const UNICODE_PATTERN = /U\+([0-9A-Fa-f]+)/;
const SHAPE_PATTERN = /※［＃(.+?)］/;

export type ConvertGaijiOptions = {
  /** 復元するとこの配列内の文字列になる外字は、注記のまま残す。 */
  exclude?: readonly string[];
};

function extractShape(annotation: string): string | null {
  const body = SHAPE_PATTERN.exec(annotation)?.[1];
  const descriptor = body?.split('、')[0]?.trim();
  if (!descriptor) return null;

  const shape = descriptor.replace(/[「」]/g, '').trim();
  return shape === '' ? null : shape;
}

function resolveGaiji(annotation: string): string | undefined {
  const jisMatch = JIS_PATTERN.exec(annotation) ?? PLANE_CELL_PATTERN.exec(annotation);
  if (jisMatch) {
    const key = `${jisMatch[1]}-${Number(jisMatch[2])}-${Number(jisMatch[3])}`;
    return gaijiTable[key];
  }

  const unicodeMatch = UNICODE_PATTERN.exec(annotation);
  if (unicodeMatch?.[1]) {
    const codepoint = Number.parseInt(unicodeMatch[1], 16);
    if (codepoint <= 0x10ffff && (codepoint < 0xd800 || codepoint > 0xdfff)) {
      return String.fromCodePoint(codepoint);
    }
    return undefined;
  }

  const shape = extractShape(annotation);
  if (shape && Object.hasOwn(gaijiShapeTable, shape)) return gaijiShapeTable[shape];
}

/**
 * 青空文庫の外字注記を Unicode 文字に変換する。
 *
 * - `第3水準` / `第4水準` 注記: JIS X 0213 マッピング表で Unicode 文字に変換
 * - `U+XXXX` 注記: そのコードポイントの文字に変換
 * - 字形描写のみの注記: 青空文庫の外字注記辞書から生成した表で Unicode 文字に変換
 * - 変換できない注記（Unicode未収録、辞書にない字形描写）はそのまま残す
 *
 * @example
 * convertGaiji('※［＃「てへん＋劣」、第3水準1-84-77］')
 * // → '挘'
 */
export function convertGaiji(text: string, options: ConvertGaijiOptions = {}): string {
  const excluded = options.exclude && new Set(options.exclude);
  return text.replace(ANNOTATION_PATTERN, (annotation) => {
    const restored = resolveGaiji(annotation);
    return restored === undefined || excluded?.has(restored) ? annotation : restored;
  });
}
