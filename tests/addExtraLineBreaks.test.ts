import { describe, expect, it } from 'vitest';
import { addExtraLineBreaks } from '../src/addExtraLineBreaks.js';

describe('addExtraLineBreaks', () => {
  it('uses the nesting of Japanese quotation marks for the entire text', () => {
    expect(addExtraLineBreaks('「そうです。「明日です。」行きます。」と彼は言った。')).toBe(
      '「そうです。「明日です。」行きます。」と彼は言った。\n',
    );
  });

  it('adds one CRLF and preserves existing newlines and whitespace', () => {
    expect(addExtraLineBreaks('　終わり。\r\n\r\n次。 ')).toBe('　終わり。\r\n\r\n\r\n次。\r\n ');
  });

  it('counts restored gaiji punctuation and skips notes and ruby readings', () => {
    const input = '※［＃U+300C］語《よみ。》。※［＃U+300D］※［＃不明「。］※［＃U+3002］';
    expect(addExtraLineBreaks(input)).toBe(`${input}\n`);
  });

  it('handles unmatched closing marks without affecting the next sentence', () => {
    expect(addExtraLineBreaks('」。『文。』')).toBe('」。\n『文。\n』');
  });

  it('breaks after periods in explicit ruby parents and keeps their readings intact', () => {
    expect(addExtraLineBreaks('｜語。次※［＃U+3002］終《よみ。》')).toBe(
      '｜語。\n次※［＃U+3002］\n終《よみ。》',
    );
  });
});
