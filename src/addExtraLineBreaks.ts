import { split } from 'sentence-splitter';

/**
 * 文間に改行を1つ追加する。元の空白・改行は保持し、末尾には追加しない。
 * 文境界は sentence-splitter に従い、引用・括弧内は分割しない。
 * 追加する改行は入力で最初に現れる改行コード（なければ LF）を使う。
 * 呼び出すたびに改行を追加するため、繰り返し適用すると空白行が増える。
 */
export function addExtraLineBreaks(text: string): string {
  const sentences = split(text).filter((node) => node.type === 'Sentence');
  if (sentences.length < 2) return text;

  const newline = text.match(/\r\n|\r|\n/)?.[0] ?? '\n';
  const parts: string[] = [];
  let start = 0;
  for (const sentence of sentences.slice(0, -1)) {
    const end = sentence.range[1];
    parts.push(text.slice(start, end), newline);
    start = end;
  }
  parts.push(text.slice(start));
  return parts.join('');
}
