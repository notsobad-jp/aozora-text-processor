import { describe, expect, it } from 'vitest';
import { deduplicateRuby } from '../src/deduplicateRuby.js';

describe('deduplicateRuby', () => {
  it('keys by both parent and reading and resets for each call', () => {
    const input = '今日《きょう》。今日《こんにち》。｜今日《きょう》。｜京《きょう》。';
    expect(deduplicateRuby(input)).toBe('今日《きょう》。今日《こんにち》。今日。｜京《きょう》。');
    expect(deduplicateRuby('今日《きょう》。今日《きょう》。')).toBe('今日《きょう》。今日。');
  });

  it('inserts a marker when removal would change the remaining ruby parent', () => {
    expect(deduplicateRuby('藪《やぶ》、藪《やぶ》今日《きょう》')).toBe(
      '藪《やぶ》、藪｜今日《きょう》',
    );
    expect(deduplicateRuby('Zoë《ゾーイ》、｜Zoë《ゾーイ》Hugo《ユーゴー》')).toBe(
      'Zoë《ゾーイ》、Zoë｜Hugo《ユーゴー》',
    );
  });

  it('compares gaiji parents by their restored text', () => {
    expect(deduplicateRuby('藪《やぶ》と※［＃U+85EA］《やぶ》')).toBe('藪《やぶ》と※［＃U+85EA］');
  });

  it('compares parents across the line breaks added outside dialogue', () => {
    expect(deduplicateRuby('「｜文。次《よみ》」｜文。\n次《よみ》')).toBe(
      '「｜文。次《よみ》」文。\n次',
    );
  });
});
