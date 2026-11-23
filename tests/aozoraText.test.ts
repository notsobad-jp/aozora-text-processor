import { describe, expect, it } from 'vitest';
import { aozoraText, convertGaiji, deduplicateRuby, extractBody } from '../src/index.js';

describe('aozoraText', () => {
  it('chains string operations and returns the content ready for delivery', () => {
    const source = [
      '-----',
      '【テキスト中に現れる記号について】',
      '外字とルビの説明',
      '-----',
      '',
      '　学校《がっこう》今日《きょう》。\r',
      '［＃改ページ］\r',
      '今日《きょう》と今日《こんにち》。※［＃「てへん＋劣」、第3水準1-84-77］※［＃不明］。 ',
      '',
      '底本：例',
    ].join('\n');

    const contents: string[] = aozoraText(source)
      .extractBody()
      .removeEditorialAnnotations()
      .convertGaiji({ exclude: ['《', '》', '｜'] })
      .filterRuby()
      .addExtraLineBreaks()
      .chunkText(1)
      .map((content) => deduplicateRuby(content))
      .map((content) => convertGaiji(content));

    expect(contents).toEqual([
      '　学校｜今日《きょう》。\r\n\r\n\r\n今日と今日《こんにち》。\r\n挘※［＃不明］。\r\n ',
    ]);
  });

  it('preserves real bracket and bar annotations until the final conversion', () => {
    const opening = '※［＃始め二重山括弧、1-1-52］';
    const closing = '※［＃終わり二重山括弧、1-1-53］';
    const bar = '※［＃縦線、U+FF5C］';
    const source = `旧${bar}今日《きょう》。今日${opening}きょう${closing}。今日《きょう》。`;
    const [content] = aozoraText(source)
      .convertGaiji({ exclude: ['《', '》', '｜'] })
      .filterRuby()
      .chunkText(1);

    expect(content).toBe(source);
    expect(convertGaiji(deduplicateRuby(content ?? ''))).toBe(
      '旧｜今日《きょう》。今日《きょう》。今日。',
    );
  });

  it('preserves the original dialogue scope in a cut and resets ruby at each chunk', () => {
    const source = '「室《へや》。室《へや》。室《へや》。 」その後。';
    const contents = aozoraText(source)
      .addExtraLineBreaks()
      .chunkText(2)
      .map((content) => deduplicateRuby(content));

    expect(contents).toEqual(['「室《へや》。室。室…', '「室《へや》。室。室。 」その後。\n']);
  });

  it('keeps an excluded closing bracket with the period that precedes it', () => {
    const first = `※［＃始め二重山括弧、1-1-52］${'あ'.repeat(9)}。※［＃終わり二重山括弧、1-1-53］`;
    const second = `${'い'.repeat(30)}。`;
    const contents = aozoraText(first + second)
      .convertGaiji({ exclude: ['《', '》', '｜'] })
      .addExtraLineBreaks()
      .chunkText(2, { overlapLastSentence: false })
      .map((content) => convertGaiji(content));

    expect(contents).toEqual([`《${'あ'.repeat(9)}。\n》`, `${second}\n`]);
  });

  it('keeps the input of a reused chain and the standalone string API', () => {
    const raw = '学校《がっこう》。\n底本：例';
    const chain = aozoraText(raw).extractBody();

    expect(extractBody(raw)).toBe('学校《がっこう》。');
    expect(chain.filterRuby().chunkText(1)).toEqual(['学校。']);
    expect(chain.chunkText(1)).toEqual(['学校《がっこう》。']);
  });
});
