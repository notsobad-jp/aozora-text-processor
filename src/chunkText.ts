import { split } from 'sentence-splitter';

export type ChunkTextOptions = {
  /** 各チャンクの最終文を次のチャンクの先頭にも含める @default true */
  overlapLastSentence?: boolean;
};

const FORCE_CUT_THRESHOLD = 1.5;

/**
 * テキストを文単位で指定数のチャンクに分割する。
 *
 * - 文境界の判定は sentence-splitter を利用
 * - 各チャンクの境界は「目標位置に最も近い文境界」を選んで全体を均等化（Balanced 方式）
 * - 1文がチャンクの目標サイズを大きく超える場合、文字数で強制カット
 * - `overlapLastSentence: true` のとき、各チャンクの最終文を次のチャンクの先頭にも複製
 */
export function chunkText(text: string, count: number, options: ChunkTextOptions = {}): string[] {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error('count must be a positive integer');
  }
  if (count === 1) return [text];
  if (text.length === 0) return Array.from({ length: count }, () => '');

  const target = text.length / count;
  const candidates = collectBreakCandidates(text, target);
  const chosen = pickBalancedBreaks(candidates, text.length, count);

  const chunks: string[] = [];
  let start = 0;
  for (const end of chosen) {
    chunks.push(text.slice(start, end));
    start = end;
  }
  chunks.push(text.slice(start));
  while (chunks.length < count) chunks.push('');

  const overlap = options.overlapLastSentence ?? true;
  if (!overlap) return chunks;
  return chunks.map((chunk, i) => (i === 0 ? chunk : lastSentenceOf(chunks[i - 1] ?? '') + chunk));
}

/**
 * 文末位置を break 候補として収集し、目標サイズの 1.5 倍を超える区間には
 * 文字数ベースの強制カット位置を挟む。
 */
function collectBreakCandidates(text: string, target: number): number[] {
  const sentenceEnds: number[] = [];
  for (const node of split(text)) {
    if (node.type === 'Sentence') sentenceEnds.push(node.range[1]);
  }

  const breaks: number[] = [];
  let prev = 0;
  for (const end of [...sentenceEnds, text.length]) {
    const segLen = end - prev;
    if (segLen > target * FORCE_CUT_THRESHOLD) {
      const numPieces = Math.ceil(segLen / target);
      for (let i = 1; i < numPieces; i++) {
        const cut = prev + Math.round((segLen * i) / numPieces);
        if (cut > prev && cut < end) breaks.push(cut);
      }
    }
    if (end < text.length) breaks.push(end);
    prev = end;
  }

  return [...new Set(breaks)].sort((a, b) => a - b).filter((b) => b > 0 && b < text.length);
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
    if (node?.type === 'Sentence') return node.raw;
  }
  return '';
}
