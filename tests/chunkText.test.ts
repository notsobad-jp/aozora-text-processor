import { describe, expect, it } from 'vitest';
import { chunkText } from '../src/chunkText.js';
import { convertGaiji } from '../src/convertGaiji.js';

describe('chunkText', () => {
  it('returns the entire text as a single chunk when count is 1', () => {
    const text = '　これは最初の文です。\nこれは二文目です。 ';
    expect(chunkText(text, 1)).toEqual([text]);
  });

  it('balances the text at nearby sentence endings', () => {
    const text = '一文目。二文目。三文目。四文目。五文目。六文目。';
    expect(chunkText(text, 3, { overlapLastSentence: false })).toEqual([
      '一文目。二文目。',
      '三文目。四文目。',
      '五文目。六文目。',
    ]);
  });

  it('keeps later targets at the original equal divisions after moving an earlier cut', () => {
    const first = `${'あ'.repeat(12)}。`;
    const rest = `${'い'.repeat(16)}。`;
    expect(chunkText(first + rest, 3, { overlapLastSentence: false })).toEqual([
      first,
      `${'い'.repeat(7)}…`,
      rest,
    ]);
  });

  it('keeps consecutive closing brackets in the same chunk as the sentence ending', () => {
    const text = '（「あ。」）\nいちに。さんし。';
    expect(chunkText(text, 3, { overlapLastSentence: false })).toEqual([
      '（「あ。」）\n…',
      '（「あ。」）\nいちに。',
      'さんし。',
    ]);
    expect(chunkText('（あ。\n）い。\nう。\n', 3, { overlapLastSentence: false })).toEqual([
      '（あ。\n）',
      'い。\n',
      'う。\n',
    ]);
  });

  it('prepends the previous chunk last sentence by default at a sentence boundary', () => {
    const text = '一文目。二文目。三文目。四文目。';
    expect(chunkText(text, 2)).toEqual(['一文目。二文目。', '二文目。三文目。四文目。']);
    expect(chunkText('あ。い。う。', 3)).toEqual(['あ。', 'あ。い。', 'い。う。']);
  });

  it('keeps balancing when the only sentence end would leave an oversized chunk', () => {
    const first = `短。${'長'.repeat(49)}`;
    expect(chunkText(`短。${'長'.repeat(100)}。`, 2, { overlapLastSentence: false })).toEqual([
      `${first}…`,
      `…${'長'.repeat(91)}。`,
    ]);
  });

  it('keeps dialogue closing brackets together and continues into the following narration', () => {
    const text = '「分かりました。」と言うと、二人は長い道を歩いて、隣の町へ出た。';
    const [first, second] = chunkText(text, 2, { overlapLastSentence: false });
    expect(first).toBe('「分かりました。」と言うと、二人…');
    expect(second).toBe(text);
  });

  it('restores context from the original start of the same sentence across repeated cuts', () => {
    const text = '駅を出て、川を渡り、山を越えて町に着いた。';
    expect(chunkText(text, 3, { overlapLastSentence: false })).toEqual([
      '駅を出て、川を…',
      '駅を出て、川を渡り、山を越え…',
      '駅を出て、川を渡り、山を越えて町に着いた。',
    ]);
    // 明示ルビ付きの三つのまとまりの間で切り、指定例と同じ位置を検証する。
    const first = '｜駅を出て、《えきをでて》';
    const second = '｜川を渡り、《かわをわたり》';
    const third = '｜山を越えて町に着いた《やまをこえてまちについた》。';
    expect(chunkText(first + second + third, 3)).toEqual([
      `${first}…`,
      `${first}${second}…`,
      first + second + third,
    ]);
  });

  it('limits the already read prefix to 40 displayed characters and keeps all new text', () => {
    const first = 'あ'.repeat(41);
    const second = 'い'.repeat(41);
    const third = `${'う'.repeat(40)}。`;
    expect(chunkText(first + second + third, 3)).toEqual([
      `${first}…`,
      `…${'あ'.repeat(40)}${second}…`,
      `…${'い'.repeat(40)}${third}`,
    ]);
  });

  it('omits a whole ruby from the old prefix when its parent crosses the context limit', () => {
    const ruby = `｜${'長'.repeat(41)}《ながい》`;
    const rest = `${'次'.repeat(40)}。`;
    expect(chunkText(ruby + rest, 2)).toEqual([`${ruby}…`, `…${rest}`]);
  });

  it('uses character boundaries when there are too few sentence endings', () => {
    const source = '藪《とても長いよみ》か\u3099※［＃不明］';
    expect(chunkText(source, 3)).toEqual([
      '藪《とても長いよみ》…',
      '藪《とても長いよみ》か\u3099…',
      source,
    ]);
    expect(chunkText('👩‍💻𩸽', 2)).toEqual(['👩‍💻…', '👩‍💻𩸽']);
  });

  it('keeps graphemes across gaiji annotations and ends a sentence after the whole ruby', () => {
    expect(chunkText('あ※［＃U+304B］\u3099い', 2)).toEqual(['あ…', 'あ※［＃U+304B］\u3099い']);
    expect(chunkText('｜文。\n《ぶん》次。', 2, { overlapLastSentence: false })).toEqual([
      '｜文。\n《ぶん》',
      '次。',
    ]);
    expect(chunkText('｜（文。）《ぶん》次の文。', 2, { overlapLastSentence: false })).toEqual([
      '｜（文。）《ぶん》',
      '次の文。',
    ]);
  });

  it('counts retained gaiji by their source notation and cuts only before or after it', () => {
    const source = 'あいうえおか※［＃U+300A］きくけ';
    expect(chunkText(source, 2)).toEqual(['あいうえおか…', source]);
    const [first] = chunkText('あ※［＃不明「。］い。う。', 2);
    expect(first).toBe('あ※［＃不明「。］…');
  });

  it('preserves indentation and original line endings with no whitespace-only chunks', () => {
    expect(chunkText('\n\n　一。\r\n　次。 ', 2, { overlapLastSentence: false })).toEqual([
      '\n\n　一。\r\n',
      '　次。 ',
    ]);
    expect(chunkText('あ　 　い 　', 2)).toEqual(['あ…', 'あ　 　い 　']);
  });

  it('throws when the requested count requires empty chunks or breaking markup', () => {
    for (const text of ['', '　\n', '　藪《やぶ》　']) {
      expect(() => chunkText(text, 2)).toThrow(/requested count/);
    }
    expect(() => chunkText('（あ。）', 4)).toThrow(/requested count/);
    expect(() => chunkText(convertGaiji('※［＃U+3000］'), 1)).toThrow(/requested count/);
  });

  it.each([0, -1, 1.5, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid count %s',
    (count) => expect(() => chunkText('text', count)).toThrow(/positive integer/),
  );
});
