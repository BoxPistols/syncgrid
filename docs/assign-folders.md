# ブックマークの割り当てを型付き判定で行う

## いまの作り

`suggestCategories`（`src/utils/ai.ts`）は、全ブックマークを1つのプロンプトに詰め、フォルダ名の考案と各ブックマークの割り当てを同時にJSONで書かせている。

```
Return ONLY valid JSON: {"categoryName": ["bookmark title 1", ...], ...}
```

弱点が3つある。

1. パースに失敗すると`{}`を返す。30件送って1件も返らないことがある
2. 割り当ての対応付けにブックマークの題を使っている。題が重複・変化すると崩れる
3. 呼ぶたびにフォルダ名が変わりうる

## 何を置き換えられるか

Jevは文章を生成しないので、フォルダ名の考案は置き換えられない。置き換えるのは割り当てだけで、フォルダは既存のものか、先に決めたものを渡す。返るのは選択肢のラベルと確率なので、パースの失敗は起きない。添字で対応付けるため、題の重複にも影響されない。

## 測った結果（2026-09-20、jev-1.13.0）

ブックマーク30件を6つのフォルダ（dev-docs / learning / tools / news / shopping / other）へ割り当てた。正解は手で付けた。

| 方式 | 正解 | 時間 | 入力トークン | 費用 |
|---|---|---|---|---|
| 30件を1リクエスト | 30/30 | 304ms | 6,153 | $0.00026 |
| 1件ずつ30リクエスト | 29/30 | 9,456ms | 13,318 | $0.00056 |

まとめて送るほうが速く、安く、正確だった。1件ずつで唯一外した「航空券の予約確認」（shoppingと判定）も、まとめて送ると正しくotherになった。

3回繰り返して30件すべて同じ判定で、confidenceは全件0.8以上だった。

現行の`suggestCategories`との直接比較はしていない。OpenAI/Geminiのキーが手元に無いためで、比較できるのは構造の違い（パース失敗が起きうるかどうか）までになる。正解ラベルと題材は筆者が用意したもので、30件と少ない。

## 使い方

```ts
import { assignFolders } from './utils/assignFolders'

const assignments = await assignFolders(
  items.map((i) => ({ title: i.title, url: i.url })),
  folders.map((f) => ({ name: f.name, description: f.description })),
  { apiKey: settings.typesafeApiKey },
)
// assignments[i] = { index, folder: 'tools' | null, confidence }
```

`folder`がnullになるのは、受け皿（other）が選ばれたときと、confidenceが0.6未満のとき。呼び出し側は、そのブックマークを未分類のまま残す。

## まだやっていないこと

画面への配線はこのPRに含めていない。`AiCategorizeModal`の適用処理はフォルダ名から新規作成する作りなので、既存フォルダへ割り当てるにはその部分の変更が要る。順序としては、既存フォルダへの割り当てを先に入れ、フォルダ名の考案が必要な場面だけ今のLLM呼び出しを残すのがよいと考えている。

## 測り直す

```bash
TYPESAFE_API_KEY=... node tools/measure-assign-folders.mjs
```
