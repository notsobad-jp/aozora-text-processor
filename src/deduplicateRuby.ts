import { convertGaiji } from './convertGaiji.js';
import { replaceRuby } from './rubyMarkup.js';

/** 親文字と読みが同じルビは、渡された本文の初出だけに残す。 */
export function deduplicateRuby(text: string): string {
  const seen = new Set<string>();
  return replaceRuby(text, (parent, reading) => {
    const base = convertGaiji(parent).replace(/(?<=。)[\r\n]+/gu, '');
    const key = JSON.stringify([base, reading]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
