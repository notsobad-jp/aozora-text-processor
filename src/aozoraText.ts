import { addExtraLineBreaks } from './addExtraLineBreaks.js';
import { type ChunkTextOptions, chunkText } from './chunkText.js';
import { type ConvertGaijiOptions, convertGaiji } from './convertGaiji.js';
import { extractBody } from './extractBody.js';
import { filterRuby } from './filterRuby.js';
import { removeEditorialAnnotations } from './removeEditorialAnnotations.js';

class AozoraText {
  constructor(private readonly text: string) {}

  extractBody(): AozoraText {
    return new AozoraText(extractBody(this.text));
  }

  removeEditorialAnnotations(): AozoraText {
    return new AozoraText(removeEditorialAnnotations(this.text));
  }

  convertGaiji(options?: ConvertGaijiOptions): AozoraText {
    return new AozoraText(convertGaiji(this.text, options));
  }

  filterRuby(): AozoraText {
    return new AozoraText(filterRuby(this.text));
  }

  addExtraLineBreaks(): AozoraText {
    return new AozoraText(addExtraLineBreaks(this.text));
  }

  chunkText(count: number, options?: ChunkTextOptions): string[] {
    return chunkText(this.text, count, options);
  }
}

/** 取得済みの文字列を青空文庫の加工チェーンで扱えるようにする。 */
export function aozoraText(text: string): AozoraText {
  return new AozoraText(text);
}
