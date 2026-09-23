import { describe, expect, it } from 'vitest';
import { chunkText } from '../src/chunkText.js';

describe('chunkText', () => {
  it('returns the entire text as a single chunk when count is 1', () => {
    const text = 'これは最初の文です。これは二文目です。これは三文目です。';
    expect(chunkText(text, 1)).toEqual([text]);
  });

  it('splits at sentence boundaries and returns the requested number of chunks', () => {
    const text = '一文目。二文目。三文目。四文目。五文目。六文目。';
    const chunks = chunkText(text, 3, { overlapLastSentence: false });

    expect(chunks).toHaveLength(3);
    expect(chunks.join('')).toBe(text);
    for (const chunk of chunks) {
      expect(chunk.endsWith('。')).toBe(true);
    }
  });

  it('balances chunk sizes by picking the sentence boundary nearest to each target position', () => {
    // 文長: 6, 6, 6, 60, 6, 6, 6 (合計 96, count=2 → target=48)
    // 文境界候補: 6, 12, 18, 78, 84, 90, 96。target 48 に最も近いのは 78（dist 30）または 18（dist 30）。
    // 候補が同距離のとき貪欲は早い側を選ぶため 18 が分割境界になる。
    const sentences = [
      '短文一。',
      '短文二。',
      '短文三。',
      `${'長'.repeat(58)}。`,
      '短文五。',
      '短文六。',
      '短文七。',
    ];
    const text = sentences.join('');
    const [first, second] = chunkText(text, 2, { overlapLastSentence: false });

    expect(first).toBe('短文一。短文二。短文三。');
    expect(second).toBe(`${'長'.repeat(58)}。短文五。短文六。短文七。`);
  });

  it('force-cuts a single sentence longer than 1.5x the target chunk size', () => {
    const longSentence = `${'あ'.repeat(300)}。`;
    const chunks = chunkText(longSentence, 3, { overlapLastSentence: false });

    expect(chunks).toHaveLength(3);
    expect(chunks.join('')).toBe(longSentence);
    // 全チャンクが目標サイズ近辺に収まる（target ≈ 100）
    for (const chunk of chunks) {
      expect(chunk.length).toBeGreaterThan(50);
      expect(chunk.length).toBeLessThan(150);
    }
  });

  it('prepends the previous chunk last sentence by default', () => {
    const text = '一文目。二文目。三文目。四文目。';
    const [a, b] = chunkText(text, 2);

    expect(a).toBe('一文目。二文目。');
    expect(b).toBe('二文目。三文目。四文目。');
  });

  it('rejects empty input even for a single chunk', () => {
    expect(() => chunkText('', 1)).toThrow('text must not be empty');
    expect(() => chunkText('', 3)).toThrow('text must not be empty');
  });

  it('rejects a count greater than the number of graphemes without padding', () => {
    for (const text of ['短文', '😀', 'か\u3099', '👨‍👩‍👧‍👦']) {
      expect(() => chunkText(text, 3)).toThrow('count must not exceed the number of graphemes');
    }
  });

  it('fills missing sentence boundaries without producing empty chunks', () => {
    const text = 'あ。い。う。';
    const chunks = chunkText(text, 4, { overlapLastSentence: false });
    expect(chunks).toHaveLength(4);
    expect(chunks.every((chunk) => chunk.length > 0)).toBe(true);
    expect(chunks.join('')).toBe(text);
  });

  it('splits short text up to one grapheme per chunk and keeps the default overlap', () => {
    expect(chunkText('短文', 2)).toEqual(['短', '短文']);
    expect(chunkText('短文', 2, { overlapLastSentence: false })).toEqual(['短', '文']);
  });

  it('preserves surrogate pairs, combining marks, variation selectors and emoji sequences', () => {
    const graphemes = ['あ', '😀', 'か\u3099', '𠮷', '👨‍👩‍👧‍👦', '✌️', '🇯🇵', 'い'];
    const text = graphemes.join('');
    const segmenter = new Intl.Segmenter('ja', { granularity: 'grapheme' });
    for (let count = 1; count <= graphemes.length; count++) {
      const chunks = chunkText(text, count, { overlapLastSentence: false });
      expect(chunks).toHaveLength(count);
      expect(chunks.every((chunk) => chunk.length > 0)).toBe(true);
      expect(chunks.join('')).toBe(text);
      expect(
        chunks.flatMap((chunk) => [...segmenter.segment(chunk)].map((s) => s.segment)),
      ).toEqual(graphemes);
      for (const chunk of chunkText(text, count)) {
        expect([...segmenter.segment(chunk)].every((s) => graphemes.includes(s.segment))).toBe(
          true,
        );
      }
    }
  });

  it('returns 365 nonempty chunks in order', () => {
    const sentences = Array.from(
      { length: 365 },
      (_, i) => `第${String(i + 1).padStart(3, '0')}日。`,
    );
    const chunks = chunkText(sentences.join(''), 365);
    expect(chunks).toEqual(
      sentences.map((sentence, i) => (i === 0 ? sentence : sentences[i - 1] + sentence)),
    );
  });

  it('keeps combining marks with punctuation when repeating the last sentence', () => {
    const text = 'あ。\u0301い。う。え。';
    const segmenter = new Intl.Segmenter('ja', { granularity: 'grapheme' });
    const graphemes = [...segmenter.segment(text)].map((s) => s.segment);
    for (const count of [2, 3, 4]) {
      for (const chunk of chunkText(text, count)) {
        expect([...segmenter.segment(chunk)].every((s) => graphemes.includes(s.segment))).toBe(
          true,
        );
      }
    }
  });

  it('throws when count is not a positive integer', () => {
    expect(() => chunkText('text', 0)).toThrow();
    expect(() => chunkText('text', -1)).toThrow();
    expect(() => chunkText('text', 1.5)).toThrow();
  });
});
