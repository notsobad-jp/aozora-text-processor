import { describe, expect, it } from 'vitest';
import { addExtraLineBreaks } from '../src/index.js';

describe('addExtraLineBreaks', () => {
  it('adds a newline at each sentence boundary, including before an existing newline', () => {
    expect(addExtraLineBreaks('甲。乙。\n丙。')).toBe('甲。\n乙。\n\n丙。');
  });

  it('keeps existing blank lines and adds one more newline', () => {
    expect(addExtraLineBreaks('甲。\n\n乙。')).toBe('甲。\n\n\n乙。');
  });

  it('preserves leading, inter-sentence and trailing whitespace', () => {
    expect(addExtraLineBreaks('\n　甲。　\t乙。 \n\n')).toBe('\n　甲。\n　\t乙。 \n\n');
  });

  it('keeps line wrapping inside a sentence', () => {
    expect(addExtraLineBreaks('今日は\n晴れです。外へ行こう。')).toBe(
      '今日は\n晴れです。\n外へ行こう。',
    );
  });

  it.each(['', ' \t\r\n　', '甲。', '甲。\n\n', '甲。 \t', '句点がない文', '甲\n乙'])(
    'leaves an input with fewer than two sentences unchanged: %j',
    (text) => {
      expect(addExtraLineBreaks(text)).toBe(text);
    },
  );

  it('does not add a newline after the last sentence or its trailing whitespace', () => {
    expect(addExtraLineBreaks('甲。乙。\n\n')).toBe('甲。\n乙。\n\n');
  });

  it('adds a newline before an unfinished last sentence', () => {
    expect(addExtraLineBreaks('甲。まだ続く')).toBe('甲。\nまだ続く');
  });

  it('handles Japanese question marks and exclamation marks', () => {
    expect(addExtraLineBreaks('本当？そうだ！行こう。')).toBe('本当？\nそうだ！\n行こう。');
  });

  it('uses sentence-splitter rules for ASCII punctuation, abbreviations and decimals', () => {
    expect(addExtraLineBreaks('Dr. Smith has 3.14 pies. 本当? そうだ!')).toBe(
      'Dr. Smith has 3.14 pies.\n 本当?\n そうだ!',
    );
  });

  it('keeps punctuation inside quoted speech with its closing bracket and narration', () => {
    expect(addExtraLineBreaks('彼は「甲。乙。」と言った。丙。')).toBe(
      '彼は「甲。乙。」と言った。\n丙。',
    );
  });

  it('keeps consecutive dialogue together according to sentence-splitter', () => {
    expect(addExtraLineBreaks('「甲。」\n「乙。」')).toBe('「甲。」\n「乙。」');
  });

  it('keeps nested quotes and parentheses intact', () => {
    expect(addExtraLineBreaks('彼は「『甲。』乙。」と言った。（丙。丁。）次。終。')).toBe(
      '彼は「『甲。』乙。」と言った。\n（丙。丁。）次。\n終。',
    );
  });

  it('preserves malformed unclosed quotes according to sentence-splitter', () => {
    expect(addExtraLineBreaks('「甲。乙。')).toBe('「甲。乙。');
  });

  it('preserves surrogate pairs and combining characters around sentence boundaries', () => {
    expect(addExtraLineBreaks('😀が来た。か\u3099く。𠮷野へ。')).toBe(
      '😀が来た。\nか\u3099く。\n𠮷野へ。',
    );
  });

  it.each(['\n', '\r\n', '\r'])('uses the first existing newline code %j', (newline) => {
    expect(addExtraLineBreaks(`甲。乙。${newline}${newline}丙。`)).toBe(
      `甲。${newline}乙。${newline}${newline}${newline}丙。`,
    );
  });

  it('preserves mixed newline codes while using the first code for insertions', () => {
    expect(addExtraLineBreaks('甲。\r\n乙。\n丙。\r丁。')).toBe(
      '甲。\r\n\r\n乙。\r\n\n丙。\r\n\r丁。',
    );
  });

  it('uses LF when the input has no newline', () => {
    expect(addExtraLineBreaks('甲。乙。丙。')).toBe('甲。\n乙。\n丙。');
  });

  it('adds another newline when called again', () => {
    expect(addExtraLineBreaks(addExtraLineBreaks('甲。乙。'))).toBe('甲。\n\n乙。');
  });
});
