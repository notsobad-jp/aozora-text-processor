import { describe, expect, it } from 'vitest';
import { splitSections } from '../src/splitSections.js';

describe('splitSections', () => {
  it('splits a typical text with header, body, and footer', () => {
    const input = [
      'こころ',
      '夏目漱石',
      '',
      '-------------------------------------------------------',
      '【テキスト中に現れる記号について】',
      '《》：ルビ',
      '-------------------------------------------------------',
      '',
      '私はその人を常に先生と呼んでいた。',
      '',
      '底本：「こころ」集英社文庫',
      '   1991（平成3）年2月25日第1刷発行',
    ].join('\n');

    const { header, body, footer } = splitSections(input);

    expect(header).toContain('こころ');
    expect(header).toContain('夏目漱石');
    expect(header.endsWith('-------------------------------------------------------')).toBe(true);
    expect(body).toBe('私はその人を常に先生と呼んでいた。');
    expect(footer).toBe('底本：「こころ」集英社文庫\n   1991（平成3）年2月25日第1刷発行');
  });

  it('returns empty header when 凡例 block is absent', () => {
    const input = ['短編作品の本文。', '', '底本：底本情報'].join('\n');

    expect(splitSections(input)).toEqual({
      header: '',
      body: '短編作品の本文。',
      footer: '底本：底本情報',
    });
  });

  it('returns empty header when only one ---...--- line is present', () => {
    const input = [
      'タイトル',
      '-------------------------------------------------------',
      '本文',
    ].join('\n');

    expect(splitSections(input)).toEqual({
      header: '',
      body: input,
      footer: '',
    });
  });

  it('returns empty footer when 底本: line is absent', () => {
    expect(splitSections('本文だけのテキスト。')).toEqual({
      header: '',
      body: '本文だけのテキスト。',
      footer: '',
    });
  });

  it('trims surrounding whitespace from each section', () => {
    const input = [
      '-------------------------------------------------------',
      '凡例',
      '-------------------------------------------------------',
      '',
      '',
      '本文。',
      '',
      '',
      '底本：foo',
    ].join('\n');

    expect(splitSections(input)).toEqual({
      header:
        '-------------------------------------------------------\n凡例\n-------------------------------------------------------',
      body: '本文。',
      footer: '底本：foo',
    });
  });

  it('returns empty header and footer for plain text', () => {
    expect(splitSections('ただの文字列。')).toEqual({
      header: '',
      body: 'ただの文字列。',
      footer: '',
    });
  });
});
