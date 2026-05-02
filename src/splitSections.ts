export type AozoraSections = {
  /** タイトル・著者・凡例ブロック */
  header: string;
  /** 本文 */
  body: string;
  /** 「底本：」以降の書誌情報 */
  footer: string;
};

/**
 * 青空文庫テキストをヘッダー・本文・フッターに分割する。
 *
 * - ヘッダー: 冒頭から、凡例ブロックを区切る `---...---` 行までを含めた範囲
 *   （凡例ブロックの開始と終わりの2本のハイフン行を検出する）
 * - フッター: 「底本：」で始まる行以降
 * - 確実に判定できない部分は空文字を返し、内容は本文側に残す
 * - 各セクションは前後の空白がトリムされる
 */
export function splitSections(text: string): AozoraSections {
  const hyphenLines = [...text.matchAll(/^-{3,}$/gm)];
  const colophonMatch = /^底本：/m.exec(text);

  const secondHyphen = hyphenLines[1];
  const headerEnd =
    secondHyphen?.index !== undefined ? secondHyphen.index + secondHyphen[0].length : 0;
  const footerStart = colophonMatch?.index ?? text.length;

  const safeHeaderEnd = headerEnd <= footerStart ? headerEnd : 0;

  return {
    header: text.slice(0, safeHeaderEnd).trim(),
    body: text.slice(safeHeaderEnd, footerStart).trim(),
    footer: text.slice(footerStart).trim(),
  };
}
