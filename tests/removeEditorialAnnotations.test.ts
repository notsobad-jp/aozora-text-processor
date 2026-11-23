import { describe, expect, it } from 'vitest';
import { removeEditorialAnnotations } from '../src/removeEditorialAnnotations.js';

describe('removeEditorialAnnotations', () => {
  it('removes inline annotation', () => {
    expect(removeEditorialAnnotations('彼［＃「彼」に傍点］は走った。')).toBe('彼は走った。');
  });

  it('removes multiple annotations in one input', () => {
    expect(removeEditorialAnnotations('［＃ここから２字下げ］本文［＃ここで字下げ終わり］')).toBe(
      '本文',
    );
  });

  it('keeps gaiji annotations', () => {
    const input = '※［＃「亻＋耳」、第3水準1-14-37］という字。';
    expect(removeEditorialAnnotations(input)).toBe(input);
  });

  it('preserves blank line when annotation occupies a whole line', () => {
    expect(removeEditorialAnnotations('彼は走った。\n［＃改ページ］\n次の日。')).toBe(
      '彼は走った。\n\n次の日。',
    );
  });

  it('preserves a malformed note across line breaks', () => {
    const text = '　本文［＃閉じ忘れ\r\n次の行］ ';
    expect(removeEditorialAnnotations(text)).toBe(text);
  });

  it('preserves a ruby parent when removing an annotation between kanji', () => {
    expect(removeEditorialAnnotations('学校［＃改ページ］今日《きょう》')).toBe(
      '学校｜今日《きょう》',
    );
  });

  it('removes only non-gaiji annotations when both kinds appear', () => {
    expect(
      removeEditorialAnnotations('※［＃「亻＋耳」、第3水準1-14-37］は［＃「は」に傍点］古い字。'),
    ).toBe('※［＃「亻＋耳」、第3水準1-14-37］は古い字。');
  });

  it('leaves text without annotations unchanged', () => {
    expect(removeEditorialAnnotations('普通のテキスト')).toBe('普通のテキスト');
  });

  it('returns empty string for empty input', () => {
    expect(removeEditorialAnnotations('')).toBe('');
  });
});
