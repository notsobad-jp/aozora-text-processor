# aozora-text-processor

青空文庫のテキストを整形するためのユーティリティ集。

ルビ除去、外字注記の Unicode 変換、各種注記の除去、文章単位の分割、指定数チャンクへの均等分割などを、独立した純関数として提供します。

## Features

- **`splitSections`** — テキストをヘッダー・本文・フッターに分割
- **`removeRuby`** — ルビ記法 `《...》` と開始記号 `｜` を除去
- **`removeAnnotations`** — 入力者注記 `［＃...］` を除去（外字注記はスキップ）
- **`convertGaiji`** — JIS X 0213 第3・第4水準漢字の外字注記を Unicode に変換
- **`splitSentences`** — テキストを文単位の配列に分割
- **`chunkText`** — テキストを指定数のチャンクに均等分割（ブンゴウメール的な日次配信向け）

すべての関数は独立しており、必要に応じて自由に組み合わせられます。

## Installation

```sh
pnpm add aozora-text-processor
# or
npm install aozora-text-processor
```

Node.js 18 以上、ESM のみサポート。

## Usage

典型的なパイプライン：

```ts
import {
  splitSections,
  removeRuby,
  removeAnnotations,
  convertGaiji,
  chunkText,
} from 'aozora-text-processor';

// 1. ヘッダー・フッター・凡例を除去して本文だけ取り出す
const { body } = splitSections(rawText);

// 2. 外字を Unicode に変換 → ルビ除去 → 注記除去
const text = removeAnnotations(removeRuby(convertGaiji(body)));

// 3. 30日分のチャンクに均等分割
const episodes = chunkText(text, { count: 30 });
```

各関数は独立して使えるので、必要なものだけ組み合わせて使えます。

```ts
import { removeRuby } from 'aozora-text-processor';

const cleaned = removeRuby('｜彼女《かのじょ》は走った。');
// → '彼女は走った。'
```

## API

### `splitSections(text: string): AozoraSections`

青空文庫テキストをヘッダー・本文・フッターに分割します。

```ts
type AozoraSections = {
  header: string; // タイトル・著者・凡例ブロック
  body: string;   // 本文（前後トリム済み）
  footer: string; // 「底本：」以降の書誌情報
};
```

判定ルール：

- **ヘッダー**: 冒頭から、凡例ブロックを区切る `---...---` 行までを含めた範囲
- **フッター**: 「底本：」で始まる行以降
- 確実に判定できない場合は分割せず、空文字を返して本文側に残します

`body` は前後の空白がトリムされます。

### `removeRuby(text: string): string`

青空文庫のルビ記法を除去します。

- `《ふりがな》` 部分を除去
- ルビ開始マーカー `｜` も対象パターンと共に除去
- 親文字（ルビが振られている本文）はそのまま残します

```ts
removeRuby('私は｜彼女《かのじょ》が漢字《かんじ》を書いた');
// → '私は彼女が漢字を書いた'
```

### `removeAnnotations(text: string): string`

青空文庫の入力者注記 `［＃...］` を除去します。

- 組版指定（`［＃ここから２字下げ］` など）、見出し、傍点、訂正、図版などすべての注記を一括削除
- **外字注記 `※［＃...］` は対象外**（`convertGaiji` の対象なので残します）
- 注記が単独で行を占めていた場合、その行の改行は残します

```ts
removeAnnotations('彼［＃「彼」に傍点］は走った。');
// → '彼は走った。'
```

`convertGaiji` と独立して呼べるので、順序を気にする必要はありません。

### `convertGaiji(text: string): string`

青空文庫の外字注記を Unicode 文字に変換します。

対応する注記の形式：

| 形式 | 例 | 動作 |
|---|---|---|
| JIS第3水準 | `※［＃「てへん＋劣」、第3水準1-84-77］` | JIS X 0213 マッピングで Unicode に変換 |
| JIS第4水準 | `※［＃「字形」、第4水準2-XX-XX］` | 同上 |
| Unicode指定 | `※［＃「字形」、U+XXXX、ページ-行］` | U+XXXX をそのまま Unicode 文字に |
| Unicode未収録 | `※［＃「字形」、ページ-行］` | 変換不能、元の注記をそのまま残す |
| 字形描写のみ | `※［＃「水＋(尤－尢)」］` | スコープ外、そのまま残す |

```ts
convertGaiji('※［＃「てへん＋劣」、第3水準1-84-77］');
// → '𢪙'  （該当する Unicode 文字）
```

マッピング表は [Project X0213](https://x0213.org/) の `jisx0213-2004-std.txt` を元にビルド時に生成しており、ライブラリにバンドルされます。

### `splitSentences(text: string): string[]`

テキストを文単位に分割します。内部で [sentence-splitter](https://www.npmjs.com/package/sentence-splitter) を利用します。

- 区切り文字: `。` `？` `！`
- `「」` `『』` `（）` などの対括弧内の区切り文字では分割しません（セリフを途中で切らない）
- 各文は前後トリムされ、空文字列は除外されます

```ts
splitSentences('「行かないで。戻ってきて。」と彼女は言った。雨が降っていた。');
// → ['「行かないで。戻ってきて。」と彼女は言った。', '雨が降っていた。']
```

### `chunkText(text, options): string[]`

テキストを指定数のチャンクに均等分割します。日次配信などの用途を想定しています。

```ts
type ChunkTextOptions = {
  count: number;                   // 分割数
  overlapLastSentence?: boolean;   // 各チャンクの最終文を次のチャンクの先頭にも含める（default: false）
};
```

挙動：

- 文境界（`splitSentences` と同様の判定）で区切ります
- 各チャンクの文字数ができるだけ揃うよう、全体最適で境界を決めます（Balanced 方式）
- 1文がチャンクの目標サイズを大きく超える場合、文字数で強制カットします

```ts
chunkText(text, { count: 30 });
// → 30個のチャンクが返る。各チャンクの文字数はおおむね均等

chunkText(text, { count: 30, overlapLastSentence: true });
// → 各チャンクの最終文が、次のチャンクの先頭にも含まれる
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
| `pnpm lint` | Biome で lint |
| `pnpm format` | Biome で format |

### プロジェクト構成

```
.
├── data/
│   └── jisx0213-2004-std.txt    # 元データ（コミット、npm publish には含まない）
├── scripts/
│   └── build-gaiji-table.ts     # txt → TS const に変換
├── src/
│   ├── data/
│   │   └── gaiji-table.ts       # 自動生成、コミット、配布物に含む
│   ├── splitSections.ts
│   ├── removeRuby.ts
│   ├── removeAnnotations.ts
│   ├── convertGaiji.ts
│   ├── splitSentences.ts
│   ├── chunkText.ts
│   └── index.ts
└── ...
```

## データ・ライセンス

JIS X 0213 と Unicode の対応表は [Project X0213](https://x0213.org/) が公開している `jisx0213-2004-std.txt` を利用しています（自由に利用・改変・再配布可）。

## License

MIT — Copyright (c) 2026 NOT SO BAD, LLC.
