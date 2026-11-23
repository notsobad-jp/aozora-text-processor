import { convertGaiji } from './convertGaiji.js';

const han = String.raw`[\p{Script=Han}々〆〇ヶ〻]`;
const latin = String.raw`\p{Script=Latin}\p{M}*`;
const annotation = String.raw`［＃[^］\r\n]*］`;
// addExtraLineBreaks が親文字内の句点に足す改行も親文字に含める。
const explicit = String.raw`(?:※${annotation}[\r\n]*|${annotation}|。[\r\n]*|(?!※?［＃)[^｜《》。\r\n])+`;
const implicitHan = String.raw`(?<![\p{Script=Han}々〆〇ヶ〻\p{M}])(?:※${annotation}|${han}\p{M}*)+`;
const implicitLatin = String.raw`(?<![\p{Script=Latin}\p{M}'’-])(?:${latin})+(?:['’-](?:${latin})+)*`;
const markup = new RegExp(
  String.raw`(?:｜(?<explicit>${explicit})|(?<implicit>${implicitHan}|${implicitLatin}))《(?<reading>[^《》\r\n]+)》|(?<note>※?${annotation})`,
  'gu',
);
const gaiji = new RegExp(String.raw`※${annotation}`, 'gu');
const gaijiBeforeNewline = new RegExp(String.raw`※${annotation}(?=[\r\n])`, 'gu');
const hanEnding = new RegExp(String.raw`${han}\p{M}*$`, 'u');

export function extendsImplicitParent(preceding: string, parent: string): boolean {
  const restored = convertGaiji(preceding);
  return /^\p{Script=Latin}/u.test(parent)
    ? /[\p{Script=Latin}'’-]\p{M}*$/u.test(restored)
    : hanEnding.test(restored) || /※［＃[^］]*］$/u.test(restored);
}

type SourceRange = { start: number; end: number };
type Note = SourceRange & { note: string };
type Ruby = SourceRange & { parent: string; reading: string; explicit: boolean };

export function* findMarkup(text: string): IterableIterator<Note | Ruby> {
  const scanner = new RegExp(markup);
  for (let match = scanner.exec(text); match; match = scanner.exec(text)) {
    const { note, explicit, implicit, reading } = match.groups ?? {};
    const start = match.index;
    const end = start + match[0].length;
    if (note !== undefined) {
      yield { start, end, note };
      continue;
    }

    const parent = explicit ?? implicit;
    if (parent === undefined || reading === undefined) continue;
    if (
      explicit?.match(/[\r\n]/u) &&
      [...explicit.matchAll(gaijiBeforeNewline)].some(([note]) => convertGaiji(note) !== '。')
    ) {
      scanner.lastIndex = start + 1;
      continue;
    }

    // 復元すると漢字以外になる外字は、暗黙の親文字をそこで区切る。
    let parentStart = 0;
    if (implicit !== undefined) {
      for (const match of implicit.matchAll(gaiji)) {
        const restored = convertGaiji(match[0]);
        if (restored !== match[0] && !hanEnding.test(restored)) {
          parentStart = match.index + match[0].length;
        }
      }
      for (const match of implicit.slice(0, parentStart).matchAll(gaiji)) {
        const noteStart = start + match.index;
        yield { start: noteStart, end: noteStart + match[0].length, note: match[0] };
      }
    }

    if (parentStart < parent.length) {
      yield {
        start: start + parentStart,
        end,
        parent: parent.slice(parentStart),
        reading,
        explicit: explicit !== undefined,
      };
    }
  }
}

export function replaceRuby(
  text: string,
  keep: (parent: string, reading: string) => boolean,
): string {
  let result = '';
  let offset = 0;
  let precedingRemovedParent = '';
  for (const match of findMarkup(text)) {
    if ('note' in match) continue;
    const { start, end, parent, reading, explicit } = match;
    result += text.slice(offset, start);
    if (keep(parent, reading)) {
      if (explicit || (start === offset && extendsImplicitParent(precedingRemovedParent, parent))) {
        result += '｜';
      }
      result += `${parent}《${reading}》`;
      precedingRemovedParent = '';
    } else {
      result += parent;
      precedingRemovedParent = parent;
    }
    offset = end;
  }
  return result + text.slice(offset);
}
