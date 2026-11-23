import { describe, expect, it } from 'vitest';
import { filterRuby } from '../src/filterRuby.js';

describe('filterRuby', () => {
  it('uses the indexed sound and kun readings for single kanji', () => {
    expect(filterRuby('宿《ヤド》、学《ガク》、室《へや》、藪《やぶ》')).toBe(
      '宿、学、室《へや》、藪《やぶ》',
    );
    expect(filterRuby('学《か\u3099く》')).toBe('学');
    expect(filterRuby('｜私《わたし》は｜学《がく》と私《わたし》')).toBe('私は学と私');
  });

  it('retains whole-word readings and preserves the remaining ruby parent', () => {
    const input =
      '学校《がっこう》今日《きょう》と今日《こんにち》。手紙《てがみ》。外ヶ《そとが》。';
    expect(filterRuby(input)).toBe(
      '学校｜今日《きょう》と今日《こんにち》。手紙。外ヶ《そとが》。',
    );
  });

  it('preserves non-joyo, mixed, and indeterminate readings', () => {
    const input = '行住坐臥《ぎょうじゅうざが》、｜お伽話《フェヤリー・ストーリース》、学校《？》';
    expect(filterRuby(input)).toBe(input);
  });

  it('distinguishes gaiji punctuation from a ruby parent before restoration', () => {
    const input = '漢※［＃U+300A］学校《がっこう》※［＃U+300B］';
    expect(filterRuby(input)).toBe('漢※［＃U+300A］学校※［＃U+300B］');
  });

  it('preserves indentation, unknown gaiji notes, and malformed markup', () => {
    const input = '　※［＃不明］　学校《がっこう》 \r\n［＃「文字《もじ》」に傍点］｜漢字《途中';
    expect(filterRuby(input)).toBe(
      '　※［＃不明］　学校 \r\n［＃「文字《もじ》」に傍点］｜漢字《途中',
    );
  });

  it('does not extend an explicit parent across a newline after a kanji gaiji', () => {
    const input = '｜答え※［＃U+6F22］\n学校《がっこう》';
    expect(filterRuby(input)).toBe('｜答え※［＃U+6F22］\n学校');
  });
});
