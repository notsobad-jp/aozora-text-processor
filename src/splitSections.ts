export type AozoraSections = {
  /** タイトル・著者・凡例ブロック */
  header: string;
  /** 本文 */
  body: string;
  /** 本文終了の注記または「底本：」以降 */
  footer: string;
};

const footer = /^(?:底本：|[^\S\r\n]*［＃本文終わり］[^\S\r\n]*$)/mu;
const legend =
  /^-{3,}[^\S\r\n]*(?:\r\n|\n|\r)【テキスト中に現れる記号について】[^\r\n]*(?:\r\n|\n|\r)[\s\S]*?^-{3,}[^\S\r\n]*$/mu;
const blankEdges = /^(?:[^\S\r\n]*(?:\r\n|[\r\n]))+|(?:(?:\r\n|[\r\n])[^\S\r\n]*)+$/gu;

/** 凡例と書誌情報を分け、本文の前後にある空行を外す。 */
export function splitSections(text: string): AozoraSections {
  const footerStart = footer.exec(text)?.index ?? text.length;
  const beforeFooter = text.slice(0, footerStart);
  const headerMatch = legend.exec(beforeFooter);
  const headerEnd = headerMatch ? headerMatch.index + headerMatch[0].length : 0;

  return {
    header: beforeFooter.slice(0, headerEnd).trim(),
    body: beforeFooter.slice(headerEnd).replace(blankEdges, ''),
    footer: text.slice(footerStart).trim(),
  };
}
