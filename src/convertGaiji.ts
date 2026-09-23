import { gaijiShapeTable } from './data/gaiji-shape-table.ts';
import { gaijiTable } from './data/gaiji-table.ts';

const ANNOTATION_PATTERN = /※［＃[^］]*］/g;
const JIS_PATTERN = /第[34]水準(\d)-(\d+)-(\d+)/;
const UNICODE_PATTERN = /U\+([0-9A-Fa-f]+)/;
const SHAPE_PATTERN = /※［＃(.+?)］/;

function extractShape(annotation: string): string | null {
  const body = SHAPE_PATTERN.exec(annotation)?.[1];
  const descriptor = body?.split('、')[0]?.trim();
  if (!descriptor) return null;

  const shape = descriptor.replace(/[「」]/g, '').trim();
  return shape === '' ? null : shape;
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
export function convertGaiji(text: string): string {
  return text.replace(ANNOTATION_PATTERN, (annotation) => {
    const jisMatch = JIS_PATTERN.exec(annotation);
    if (jisMatch) {
      const key = `${jisMatch[1]}-${jisMatch[2]}-${jisMatch[3]}`;
      const char = gaijiTable[key];
      if (char !== undefined) return char;
      return annotation;
    }

    const unicodeMatch = UNICODE_PATTERN.exec(annotation);
    if (unicodeMatch?.[1]) {
      const codepoint = Number.parseInt(unicodeMatch[1], 16);
      if (codepoint >= 0 && codepoint <= 0x10ffff) {
        return String.fromCodePoint(codepoint);
      }
      return annotation;
    }

    const shape = extractShape(annotation);
    if (shape) {
      const char = gaijiShapeTable[shape];
      if (char !== undefined) return char;
    }

    return annotation;
  });
}
