import { extendsImplicitParent, findMarkup } from './rubyMarkup.js';

/**
 * 組版指定や傍点などの入力者注記を除く。外字注記と元の改行は残す。
 */
export function removeEditorialAnnotations(text: string): string {
  const pattern = /(?<!※)［＃[^］\r\n]*］/gu;
  if (!text.includes('《') || !text.includes('［＃')) return text.replace(pattern, '');

  let result = '';
  let offset = 0;
  for (const match of findMarkup(text)) {
    if ('note' in match) continue;
    const gap = text.slice(offset, match.start);
    const preceding = gap.replace(pattern, '');
    result += preceding;
    if (!match.explicit && preceding !== gap && extendsImplicitParent(preceding, match.parent)) {
      result += '｜';
    }
    result += text.slice(match.start, match.end).replace(pattern, '');
    offset = match.end;
  }
  return result + text.slice(offset).replace(pattern, '');
}
