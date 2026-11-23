import { splitSections } from './splitSections.js';

/** 青空文庫テキストから本文を取り出し、本文の字下げや空白を保つ。 */
export function extractBody(text: string): string {
  return splitSections(text).body;
}
