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

  it('returns N empty chunks for empty input', () => {
    expect(chunkText('', 3)).toEqual(['', '', '']);
  });

  it('throws when count is not a positive integer', () => {
    expect(() => chunkText('text', 0)).toThrow();
    expect(() => chunkText('text', -1)).toThrow();
    expect(() => chunkText('text', 1.5)).toThrow();
  });
});
