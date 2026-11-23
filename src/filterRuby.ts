import { convertGaiji } from './convertGaiji.js';
import { compoundsWithReadings, joyoReadings } from './data/joyo-readings.js';
import { replaceRuby } from './rubyMarkup.js';

function toHiragana(reading: string): string {
  return reading
    .normalize('NFC')
    .replace(/[ァ-ヶヽヾ]/gu, (kana) => String.fromCharCode(kana.charCodeAt(0) - 0x60));
}

/** 常用漢字表の音訓索引に基づいて青空文庫のルビを選別する。 */
export function filterRuby(text: string): string {
  return replaceRuby(text, (parent, reading) => {
    const restored = convertGaiji(parent);
    const characters = [...restored];
    const kana = toHiragana(reading);
    if (!/^[\p{Script=Hiragana}\p{Script=Katakana}ー]+$/u.test(kana)) return true;
    if (!characters.every((character) => Object.hasOwn(joyoReadings, character))) return true;
    if (characters.length > 1) return compoundsWithReadings.has(restored);
    return !joyoReadings[restored]?.split(' ').some((candidate) => toHiragana(candidate) === kana);
  });
}
