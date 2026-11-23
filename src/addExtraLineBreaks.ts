import { convertGaiji } from './convertGaiji.js';
import { findMarkup } from './rubyMarkup.js';

/** 元の会話範囲を参照できるように、分割前の本文に使う。 */
export function addExtraLineBreaks(text: string): string {
  const lineEnding = /\r\n|[\r\n]/u.exec(text)?.[0] ?? '\n';
  let quoteDepth = 0;

  function formatPunctuation(value: string): string {
    return value.replace(/※?［＃[^］\r\n]*］|[「」。]/gu, (source) => {
      const character = convertGaiji(source);
      if (character === '「') quoteDepth++;
      if (character === '」' && quoteDepth > 0) quoteDepth--;
      return character === '。' && quoteDepth === 0 ? source + lineEnding : source;
    });
  }

  let offset = 0;
  let result = '';
  for (const match of findMarkup(text)) {
    result += formatPunctuation(text.slice(offset, match.start));
    if ('note' in match) {
      result += formatPunctuation(match.note);
    } else {
      const marker = match.explicit ? '｜' : '';
      result += `${marker}${formatPunctuation(match.parent)}《${match.reading}》`;
    }
    offset = match.end;
  }
  return result + formatPunctuation(text.slice(offset));
}
