import { describe, expect, it } from 'vitest';
import { extractBody } from '../src/extractBody.js';

describe('extractBody', () => {
  it('recognizes the legend and the body-end note with CRLF', () => {
    const text = [
      '作品',
      '著者',
      '-----',
      '【テキスト中に現れる記号について】',
      'ルビの説明',
      '-----',
      '',
      ' 　本文。 ',
      '',
      '　次の行。　',
      '',
      '［＃本文終わり］  ',
      '底本：版情報',
    ].join('\r\n');
    expect(extractBody(text)).toBe(' 　本文。 \r\n\r\n　次の行。　');
  });

  it('preserves rules outside a legend and body-end notes within a sentence', () => {
    const body = '　前書き\n-----\n本文［＃本文終わり］続き\n-----\n終わり。　';
    expect(extractBody(`\n${body}\n　\n底本：版情報`)).toBe(body);
  });
});
