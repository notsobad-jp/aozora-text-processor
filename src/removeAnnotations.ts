export type RemoveAnnotationsOptions = {
  /** 外字注記 ※［＃...］ を残すか（default: true） */
  skipGaiji?: boolean;
};

/**
 * 青空文庫の入力者注記 ［＃...］ を除去する。
 *
 * - 組版指定、見出し、傍点、訂正、図版などすべての注記を一括削除
 * - デフォルトでは外字注記 ※［＃...］ は対象外（convertGaiji の対象として残す）
 * - 注記が単独で行を占めていた場合、その行の改行は残す
 *
 * @example
 * removeAnnotations('彼［＃「彼」に傍点］は走った。')
 * // → '彼は走った。'
 */
export function removeAnnotations(text: string, options: RemoveAnnotationsOptions = {}): string {
  const skipGaiji = options.skipGaiji ?? true;
  const pattern = skipGaiji ? /(?<!※)［＃[^］]*］/g : /※?［＃[^］]*］/g;
  return text.replace(pattern, '');
}
