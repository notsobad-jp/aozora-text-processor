# aozora-text-processor

青空文庫のテキストを整形するためのユーティリティ集。

本文の切り出し、注記の除去、外字の復元、ルビの選別、本文の分割と各回の整形を個別に行えます。

## Installation

```sh
pnpm add @notsobad/aozora-text-processor
# or
npm install @notsobad/aozora-text-processor
```

Node.js 18 以上、ESM のみサポート。

## Usage

```ts
import {
  aozoraText,
  convertGaiji,
  deduplicateRuby,
} from '@notsobad/aozora-text-processor';

const contents = aozoraText(rawText)
  .extractBody()
  .removeEditorialAnnotations()
  .convertGaiji({ exclude: ['《', '》', '｜'] })
  .filterRuby()
  .addExtraLineBreaks()
  .chunkText(5)
  .map((content) => deduplicateRuby(content))
  .map((content) => convertGaiji(content));
```

`aozoraText` は取得済みの文字列を包んでチェーンを始めます。各メソッドは同名の単独関数を使い、`chunkText` は配列 `string[]` を返します。

分割前に会話の範囲を使って改行を足します。本文の記号 `《》｜` は外字注記のまま分割し、各回の重複ルビを除いてから復元すると、元の記号とルビの記法を区別できます。

## API

### `extractBody(text: string): string`

青空文庫の本文を切り出します。凡例の見出しと罫線が揃っていれば凡例の末尾までを除きます。行頭の `底本：` または単独行の `［＃本文終わり］` から後ろを書誌情報として除きます。本文前後の区切り空行を外し、本文の字下げ、空白、改行を保ちます。境界を確認できない部分は本文に残ります。

### `splitSections(text: string): AozoraSections`

同じ境界を使い、`{ header, body, footer }` を返します。タイトルと著者名は凡例がある場合に `header` に含まれます。

### `filterRuby(text: string): string`

常用漢字一字の読みが音訓索引と一致すればルビを除きます。常用漢字だけの熟語は、索引に語全体の読みが明記されていればルビを残します。読みの判断がつかない場合や常用外の字を含む場合もルビを残します。削除により後続ルビの親文字が広がる場合は `｜` を補います。

```ts
filterRuby('学校《がっこう》今日《きょう》は宿《ヤド》に行く。');
// → '学校｜今日《きょう》は宿に行く。'
```

### `removeEditorialAnnotations(text: string): string`

字下げ・改ページ・傍点などの入力者注記 `［＃…］` を除きます。外字注記 `※［＃…］` と既存の改行を保ちます。

```ts
removeEditorialAnnotations('彼［＃「彼」に傍点］は走った。');
// → '彼は走った。'
```

### `convertGaiji(text: string, options?: ConvertGaijiOptions): string`

青空文庫の外字注記を Unicode 文字に変換します。`exclude?: readonly string[]` に指定した文字列に復元される注記は、元の表記を保ちます。

対応する注記の形式：

| 形式 | 例 | 動作 |
|---|---|---|
| JIS第3水準 | `※［＃「てへん＋劣」、第3水準1-84-77］` | JIS X 0213 マッピングで Unicode に変換 |
| 面区点番号 | `※［＃二の字点、面区点番号1-2-22］` | JIS X 0213 マッピングで Unicode に変換 |
| JIS第4水準 | `※［＃「字形」、第4水準2-XX-XX］` | 同上 |
| Unicode指定 | `※［＃「字形」、U+XXXX、ページ-行］` | U+XXXX をそのまま Unicode 文字に |
| 字形描写のみ | `※［＃「てへん＋劣」］` | 青空文庫の外字注記辞書から生成した表で Unicode に変換 |
| ページ-行のみ | `※［＃「てへん＋劣」、123-下-5］` | 字形描写が表にあれば Unicode に変換 |
| Unicode未収録 | `※［＃「字形」、ページ-行］` | 表にない、または衝突する字形描写は元の注記をそのまま残す |

```ts
convertGaiji('※［＃「てへん＋劣」、第3水準1-84-77］');
// → '挘'
```

マッピング表は [Project X0213](https://x0213.org/) の `jisx0213-2004-std.txt` と、青空文庫の外字注記辞書 PDF を元に生成しており、ライブラリにバンドルされます。

### `chunkText(text, count, options?): string[]`

全体の文字数を指定回数で等分して仮の分割位置を決めます。その回の新規本文が基準の0.5〜1.5回分に収まる範囲で、かぎ括弧 `「」` の外にある最寄りの句点 `。` まで境界を動かします。句点に続く閉じ括弧は同じ回に含めます。

句点で分けられないときは、仮位置に近い文字の境界で切り、回の末尾に `…` を付けます。結合文字、外字注記、ルビ付きの親文字と読みは、分割せずひとまとまりとして扱います。文字数には親文字を数え、ルビの読み・開始記号と改行を除きます。残した外字注記は表記どおり数えます。空白だけの本文や、各回に新規本文を入れて指定回数に分割できない本文では `RangeError` が発生します。

文中から始まる回には、その文の頭から既読部分を戻します。既読部分は同じ数え方で最大40文字とし、先頭を省いた場合は回の頭に `…` を付けます。新しく読む本文はすべて含めます。

`overlapLastSentence`（既定値 `true`）は、文末で分けた場合に前回の最後の一文を重ねる設定です。文中で分けた場合の既読補足は、この設定にかかわらず入ります。

```ts
chunkText('駅を出て、川を渡り、山を越えて町に着いた。', 3);
// → ['駅を出て、川を…', '駅を出て、川を渡り、山を越え…', '駅を出て、川を渡り、山を越えて町に着いた。']
```

### `deduplicateRuby(text: string): string`

親文字と読みが同じルビを、渡された本文の初出だけに残します。分割で補った冒頭を含めて、各回に一度ずつ適用します。

```ts
deduplicateRuby('今日《きょう》。今日《こんにち》。今日《きょう》。');
// → '今日《きょう》。今日《こんにち》。今日。'
```

### `addExtraLineBreaks(text: string): string`

かぎ括弧 `「」` の外にある句点 `。` の直後に改行を1つ足し、既存の改行を保ちます。本文で最初に見つかる改行形式を使います。改行がない場合は LF を追加します。

```ts
addExtraLineBreaks('「明日行きます。」と彼は言った。\n次の日。');
// → '「明日行きます。」と彼は言った。\n\n次の日。\n'
```

## Development

### 必要環境

- Node.js 18+
- pnpm

### セットアップ

```sh
pnpm install
```

### スクリプト

| コマンド | 用途 |
|---|---|
| `pnpm test` | テストを1回実行 |
| `pnpm test:watch` | テストの watch モード |
| `pnpm build` | ライブラリをビルド（ESM + 型定義） |
| `pnpm build:gaiji-table` | 外字マッピングテーブルを再生成 |
| `pnpm build:gaiji-shape-table` | 字形描写マッピングテーブルを再生成 |
| `pnpm lint` | Biome で lint |
| `pnpm format` | Biome で format |

### プロジェクト構成

```
.
├── scripts/
│   ├── build-gaiji-table.ts       # Project X0213 の txt を TS const に変換
│   └── build-gaiji-shape-table.ts # 青空文庫の外字注記辞書 PDF を TS const に変換
├── src/
│   ├── data/
│   │   ├── gaiji-table.ts       # 自動生成、コミット、配布物に含む
│   │   └── gaiji-shape-table.ts # 自動生成、コミット、配布物に含む
│   ├── splitSections.ts
│   ├── filterRuby.ts
│   ├── removeEditorialAnnotations.ts
│   ├── convertGaiji.ts
│   ├── chunkText.ts
│   └── index.ts
├── tests/
│   └── *.test.ts
└── ...
```

## データ・ライセンス

JIS X 0213 と Unicode の対応表は [Project X0213](https://x0213.org/) が公開している `jisx0213-2004-std.txt` を利用しています（自由に利用・改変・再配布可）。

字形描写の対応表は [青空文庫・外字注記辞書](https://www.aozora.gr.jp/gaiji_chuki/) を元に生成しています。

常用漢字の音訓と読みを明記した熟語のデータは、[文化庁の常用漢字表の音訓索引](https://www.bunka.go.jp/kokugo_nihongo/sisaku/joho/joho/kijun/naikaku/kanji/joyokanjisakuin/) から[ブンゴウメールが抽出したデータ](https://github.com/notsobad-jp/bungo-mail-renewal/blob/2c972aed25e6063e4cf88472e8cb305aa4906dcb/src/domain/feed/aozora/joyoReadings.ts)を利用しています。

## License

MIT — Copyright (c) 2026 NOT SO BAD, LLC.
