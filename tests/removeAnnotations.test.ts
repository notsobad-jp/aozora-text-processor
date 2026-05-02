import { describe, expect, it } from 'vitest';
import { removeAnnotations } from '../src/removeAnnotations.js';

describe('removeAnnotations', () => {
  it('removes inline annotation', () => {
    expect(removeAnnotations('彼［＃「彼」に傍点］は走った。')).toBe('彼は走った。');
  });

  it('removes multiple annotations in one input', () => {
    expect(removeAnnotations('［＃ここから２字下げ］本文［＃ここで字下げ終わり］')).toBe('本文');
  });

  it('keeps gaiji annotation by default', () => {
    const input = '※［＃「亻＋耳」、第3水準1-14-37］という字。';
    expect(removeAnnotations(input)).toBe(input);
  });

  it('removes gaiji annotation when skipGaiji is false', () => {
    expect(
      removeAnnotations('※［＃「亻＋耳」、第3水準1-14-37］という字。', { skipGaiji: false }),
    ).toBe('という字。');
  });

  it('preserves blank line when annotation occupies a whole line', () => {
    expect(removeAnnotations('彼は走った。\n［＃改ページ］\n次の日。')).toBe(
      '彼は走った。\n\n次の日。',
    );
  });

  it('removes only non-gaiji annotations when both kinds appear', () => {
    expect(removeAnnotations('※［＃「亻＋耳」、第3水準1-14-37］は［＃「は」に傍点］古い字。')).toBe(
      '※［＃「亻＋耳」、第3水準1-14-37］は古い字。',
    );
  });

  it('leaves text without annotations unchanged', () => {
    expect(removeAnnotations('普通のテキスト')).toBe('普通のテキスト');
  });

  it('returns empty string for empty input', () => {
    expect(removeAnnotations('')).toBe('');
  });
});
