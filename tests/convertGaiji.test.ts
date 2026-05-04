import { describe, expect, it } from 'vitest';
import { convertGaiji } from '../src/convertGaiji.js';

describe('convertGaiji', () => {
  it('converts JIS plane-1 (第3水準) annotation via mapping table', () => {
    expect(convertGaiji('※［＃「てへん＋劣」、第3水準1-84-77］')).toBe('挘');
  });

  it('converts JIS plane-2 (第4水準) annotation via mapping table', () => {
    expect(convertGaiji('※［＃「魚へん＋花」、第4水準2-93-44］')).toBe('𩸽');
  });

  it('ignores trailing page-line info on JIS annotations', () => {
    expect(convertGaiji('※［＃「亻＋耳」、第3水準1-14-35、123-下-5］')).toBe('偁');
  });

  it('converts U+XXXX annotation directly to that codepoint', () => {
    expect(convertGaiji('※［＃「漢」、U+6F22、123-下-5］')).toBe('漢');
  });

  it('converts shape-only annotation via Aozora gaiji shape table', () => {
    expect(convertGaiji('※［＃「てへん＋劣」］')).toBe('挘');
  });

  it('converts page-line-only annotation via Aozora gaiji shape table', () => {
    expect(convertGaiji('※［＃「てへん＋劣」、123-下-5］')).toBe('挘');
  });

  it('converts shape descriptions with text outside the first quote', () => {
    expect(convertGaiji('※［＃「柳の本字」のつくり］')).toBe('丣');
  });

  it('returns multi-codepoint sequence for entries with combining characters', () => {
    const result = convertGaiji('※［＃「半濁点付きか」、第3水準1-4-87］');
    expect(result).toBe('か゚');
    expect(result).toHaveLength(2);
  });

  it('leaves annotation unchanged when JIS code is not in mapping table', () => {
    const input = '※［＃「てへん＋劣」、第3水準1-99-99］';
    expect(convertGaiji(input)).toBe(input);
  });

  it('leaves annotation unchanged when shape description is not in mapping table', () => {
    expect(convertGaiji('※［＃「水＋(尤－尢)」、123-下-5］')).toBe(
      '※［＃「水＋(尤－尢)」、123-下-5］',
    );
    expect(convertGaiji('※［＃「水＋(尤－尢)」］')).toBe('※［＃「水＋(尤－尢)」］');
  });

  it('leaves conflicting shape descriptions unchanged', () => {
    const input = '※［＃「さんずい＋（西／土）」］';
    expect(convertGaiji(input)).toBe(input);
  });

  it('converts multiple annotations within a single text', () => {
    expect(
      convertGaiji('※［＃「てへん＋劣」、第3水準1-84-77］と※［＃「亻＋耳」、第3水準1-14-35］'),
    ).toBe('挘と偁');
  });

  it('leaves text without annotations unchanged', () => {
    expect(convertGaiji('普通のテキスト')).toBe('普通のテキスト');
  });

  it('returns empty string for empty input', () => {
    expect(convertGaiji('')).toBe('');
  });
});
