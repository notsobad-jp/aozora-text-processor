import { split } from 'sentence-splitter';

export type ChunkTextOptions = {
  /** 各チャンクの最終文を次のチャンクの先頭にも含める @default true */
  overlapLastSentence?: boolean;
};

const FORCE_CUT_THRESHOLD = 1.5;
const graphemeSegmenter = new Intl.Segmenter('ja', { granularity: 'grapheme' });

/**
 * テキストを文単位で指定数のチャンクに分割する。
 *
 * - 文境界の判定は sentence-splitter を利用
 * - 各チャンクの境界は「目標位置に最も近い文境界」を選んで全体を均等化（Balanced 方式）
 * - 1文がチャンクの目標サイズを大きく超える場合、書記素境界で強制カット
 * - 空文字や、書記素数より多い分割数は拒否し、空のチャンクを作らない
 * - `overlapLastSentence: true` のとき、各チャンクの最終文を次のチャンクの先頭にも複製
 */
export function chunkText(text: string, count: number, options: ChunkTextOptions = {}): string[] {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error('count must be a positive integer');
  }
  if (text.length === 0) throw new Error('text must not be empty');
  if (count === 1) return [text];

  const boundaries: number[] = [];
  for (const { index } of graphemeSegmenter.segment(text)) {
    boundaries.push(index);
  }
  boundaries.push(text.length);
  const length = boundaries.length - 1;
  if (count > length) throw new Error('count must not exceed the number of graphemes');

  const target = length / count;
  let candidates = collectBreakCandidates(text, boundaries, target);
  // 文境界だけで件数を満たせないときも、書記素を壊さず本文全体を分配する。
  if (candidates.length < count - 1) {
    candidates = Array.from({ length: length - 1 }, (_, i) => i + 1);
  }
  const chosen = pickBalancedBreaks(candidates, length, count);

  const chunks: string[] = [];
  let start = 0;
  for (const position of chosen) {
    const end = boundaries[position];
    if (end === undefined) throw new Error('invalid grapheme boundary');
    chunks.push(text.slice(start, end));
    start = end;
  }
  chunks.push(text.slice(start));

  const overlap = options.overlapLastSentence ?? true;
  if (!overlap) return chunks;
  return chunks.map((chunk, i) => (i === 0 ? chunk : lastSentenceOf(chunks[i - 1] ?? '') + chunk));
}

/**
 * 文末位置を break 候補として収集し、目標サイズの 1.5 倍を超える区間には
 * 書記素数ベースの強制カット位置を挟む。
 */
function collectBreakCandidates(text: string, boundaries: number[], target: number): number[] {
  const sentenceEnds = new Set<number>();
  for (const node of split(text)) {
    if (node.type === 'Sentence') sentenceEnds.add(node.range[1]);
  }
  const length = boundaries.length - 1;
  const ends = boundaries.flatMap((offset, i) =>
    i > 0 && i < length && sentenceEnds.has(offset) ? [i] : [],
  );

  const breaks: number[] = [];
  let prev = 0;
  for (const end of [...ends, length]) {
    const segLen = end - prev;
    if (segLen > target * FORCE_CUT_THRESHOLD) {
      const numPieces = Math.ceil(segLen / target);
      for (let i = 1; i < numPieces; i++) {
        const cut = prev + Math.round((segLen * i) / numPieces);
        if (cut > prev && cut < end) breaks.push(cut);
      }
    }
    if (end < length) breaks.push(end);
    prev = end;
  }

  return [...new Set(breaks)].sort((a, b) => a - b).filter((b) => b > 0 && b < length);
}

/**
 * 各 i 番目の境界について、目標位置 i*L/count に最も近い候補を順に貪欲に選ぶ。
 * 後続の境界に必要な候補数を残せない場合はその候補を諦める。
 */
function pickBalancedBreaks(candidates: number[], totalLen: number, count: number): number[] {
  const chosen: number[] = [];
  let prevPos = 0;
  let candIdx = 0;

  for (let i = 1; i < count; i++) {
    const targetPos = (totalLen * i) / count;
    const needed = count - 1 - i;

    let bestIdx = -1;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let j = candIdx; j < candidates.length; j++) {
      const c = candidates[j] ?? 0;
      if (c <= prevPos) continue;
      if (candidates.length - j - 1 < needed) break;
      const dist = Math.abs(c - targetPos);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = j;
      } else {
        break;
      }
    }

    if (bestIdx === -1) break;
    const pick = candidates[bestIdx] ?? 0;
    chosen.push(pick);
    prevPos = pick;
    candIdx = bestIdx + 1;
  }

  return chosen;
}

function lastSentenceOf(text: string): string {
  const nodes = split(text);
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    if (node?.type === 'Sentence') {
      // 文境界が結合文字の途中にある場合も、重複させる範囲は書記素全体を含める。
      const segments = graphemeSegmenter.segment(text);
      const start = segments.containing(node.range[0])?.index ?? node.range[0];
      const last = segments.containing(node.range[1] - 1);
      const end = last === undefined ? node.range[1] : last.index + last.segment.length;
      return text.slice(start, end);
    }
  }
  return '';
}
