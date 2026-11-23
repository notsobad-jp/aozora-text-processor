import { convertGaiji } from './convertGaiji.js';
import { findMarkup } from './rubyMarkup.js';

export type ChunkTextOptions = {
  /** 文末で分けた場合、最後の一文を次の回の冒頭に重ねる @default true */
  overlapLastSentence?: boolean;
};

const graphemes = new Intl.Segmenter('ja', { granularity: 'grapheme' });
const closingBracket = /^[」』）)】〉》〕］\]〗〙〛”’]$/u;
const trailingCloser = /(?:※［＃[^］\r\n]*］|[」』）)】〉》〕］\]〗〙〛”’])\s*$/u;
const lineEnding = /[\r\n]/u;
const MAX_CONTEXT_LENGTH = 40;

/** 各回に新規本文が入るよう分割し、文中で分けた箇所は … と既読の文脈で示す。 */
export function chunkText(text: string, count: number, options: ChunkTextOptions = {}): string[] {
  if (!Number.isSafeInteger(count) || count < 1) {
    throw new RangeError('count must be a positive integer');
  }
  const { offsets, weights, sentenceEnds } = collectBoundaries(text);
  const last = offsets.length - 1;
  if (last < count) throw new RangeError('Text cannot be split into the requested count');
  if (count === 1) return [text];

  const weightAt = (boundary: number) => weights[boundary] ?? 0;
  const total = weightAt(last);
  const chosen = [0];
  let start = 0;
  for (let part = 1; part < count; part++) {
    const largest = last - (count - part);
    const goal = (total * part) / count;
    // 句点に寄せるのは、この回の新規本文が基準の 0.5〜1.5 回分に収まるとき。
    const minimum = weightAt(start) + total / (2 * count);
    const maximum = weightAt(start) + (3 * total) / (2 * count);
    const sentenceAt = (index: number) => sentenceEnds[index] ?? 0;
    const nearestSentence = nearestBoundary(
      lowerBound(
        sentenceEnds.length,
        (i) => sentenceAt(i) > start && weightAt(sentenceAt(i)) >= minimum,
      ),
      lowerBound(
        sentenceEnds.length,
        (i) => sentenceAt(i) > largest || weightAt(sentenceAt(i)) > maximum,
      ),
      goal,
      (i) => weightAt(sentenceAt(i)),
    );
    start =
      nearestSentence === undefined
        ? (nearestBoundary(start + 1, largest + 1, goal, weightAt) ?? largest)
        : sentenceAt(nearestSentence);
    chosen.push(start);
  }
  chosen.push(last);

  const atSentenceEnd = new Set(sentenceEnds);
  return chosen.slice(0, -1).map((start, index) => {
    const end = chosen[index + 1] ?? last;
    const previousEnd = lowerBound(sentenceEnds.length, (i) => (sentenceEnds[i] ?? 0) >= start);
    const sentenceStart = sentenceEnds[previousEnd - 1] ?? 0;
    let from = start;
    let prefix = '';
    if (start > 0 && !atSentenceEnd.has(start)) {
      const limit = weightAt(start) - MAX_CONTEXT_LENGTH;
      from = Math.max(
        sentenceStart,
        lowerBound(start, (i) => weightAt(i) >= limit),
      );
      if (from > sentenceStart) prefix = '…';
    } else if (start > 0 && (options.overlapLastSentence ?? true)) {
      from = Math.max(chosen[index - 1] ?? 0, sentenceStart);
    }
    const suffix = end === last || atSentenceEnd.has(end) ? '' : '…';
    return prefix + text.slice(offsets[from], offsets[end]) + suffix;
  });
}

function collectBoundaries(text: string) {
  const { measured, markup } = projectText(text);

  const offsets = [0];
  const weights = [0];
  const sentenceEnds: number[] = [];
  let weight = 0;
  let followsPeriod = false;
  let pendingSentenceEnd = false;
  let quoteDepth = 0;
  let outsidePeriod = -1;
  let visibleBoundary = 0;
  let markupIndex = 0;
  let sourceDelta = 0;
  let protectedStart: number | undefined;

  for (const { index, segment } of graphemes.segment(measured)) {
    const end = index + segment.length;
    const newline = lineEnding.test(segment);
    if (!newline) weight++;
    switch (segment[0]) {
      case '「':
        quoteDepth++;
        break;
      case '」':
        quoteDepth = Math.max(0, quoteDepth - 1);
        break;
      case '。':
        if (quoteDepth === 0) outsidePeriod = index;
        break;
    }
    let range = markup[markupIndex];
    while (range && range.end <= end) {
      sourceDelta = range.sourceEnd - range.end;
      range = markup[++markupIndex];
    }
    if (range && range.start < end) {
      protectedStart ??= index;
      continue;
    }

    const from = protectedStart ?? index;
    const value = protectedStart === undefined ? segment : measured.slice(from, end);
    protectedStart = undefined;
    const last = offsets.length - 1;
    const sourceEnd = end + sourceDelta;
    if (!value.trim()) {
      if (last > 0 && newline && visibleBoundary === from) {
        offsets[last] = sourceEnd;
        visibleBoundary = end;
      }
      continue;
    }

    const beforeClosing = withoutClosingBrackets(value);
    if (followsPeriod && !beforeClosing) {
      offsets[last] = sourceEnd;
      weights[last] = weight;
    } else {
      if (pendingSentenceEnd) sentenceEnds.push(last);
      offsets.push(sourceEnd);
      weights.push(weight);
      followsPeriod = beforeClosing.endsWith('。');
      pendingSentenceEnd = followsPeriod && outsidePeriod === from + beforeClosing.length - 1;
    }
    visibleBoundary = end;
  }

  offsets[offsets.length - 1] = text.length;
  weights[weights.length - 1] = weight;
  return { offsets, weights, sentenceEnds };
}

function withoutClosingBrackets(value: string): string {
  let beforeClosing = value.trimEnd();
  let closer = trailingCloser.exec(beforeClosing);
  while (closer && closingBracket.test(convertGaiji(closer[0].trimEnd()))) {
    beforeClosing = beforeClosing.slice(0, closer.index).trimEnd();
    closer = trailingCloser.exec(beforeClosing);
  }
  return beforeClosing;
}

// ルビの読みと開始記号を計数から外し、選んだ境界を原文の位置に戻す。
function projectText(text: string) {
  const markup: { start: number; end: number; sourceEnd: number }[] = [];
  let measured = '';
  let offset = 0;
  for (const match of findMarkup(text)) {
    measured += text.slice(offset, match.start);
    const start = measured.length;
    const source = 'note' in match ? match.note : match.parent;
    // 残った注記は表記どおり数え、注記内の記号は本文の句読点から外す。
    measured += source.replace(/※?［＃[^］\r\n]*］/gu, (note) =>
      note.replace(/[「」。]/gu, '\uFFFC'),
    );
    markup.push({ start, end: measured.length, sourceEnd: match.end });
    offset = match.end;
  }
  return { measured: measured + text.slice(offset), markup };
}

function lowerBound(length: number, atOrAbove: (index: number) => boolean): number {
  let left = 0;
  let right = length;
  while (left < right) {
    const middle = Math.floor((left + right) / 2);
    if (atOrAbove(middle)) right = middle;
    else left = middle + 1;
  }
  return left;
}

function nearestBoundary(
  first: number,
  afterLast: number,
  goal: number,
  weightAt: (index: number) => number,
): number | undefined {
  if (first >= afterLast) return undefined;

  const next = first + lowerBound(afterLast - first, (i) => weightAt(first + i) >= goal);
  if (next === afterLast) return next - 1;
  if (next > first && goal - weightAt(next - 1) <= weightAt(next) - goal) return next - 1;
  return next;
}
