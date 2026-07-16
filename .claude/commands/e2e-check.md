---
description: 実ビルド拡張のE2Eスモーク(headless Chrome for Testing + CDP)
---

ユニットテスト(chromeMock)では検出できない実機依存の退行を確認します:

1. `npm run build` — 最新の dist/ を生成
2. `npm run e2e:smoke` — headless Chrome for Testing に dist/ をロードして検証
   - bookmarks.move の index 意味論(mock と実機の乖離検出)
   - background service worker の生存 + FETCH_HTML の URL ガード
     (background.ts に import を追加した場合、manifest の `"type": "module"` なしで SW が黙って死ぬ — この退行を検出する)

失敗した場合は該当チェック名と detail を分析して修正してください。
Chrome for Testing が見つからない場合は `CFT_PATH` 環境変数でバイナリを指定できます。

実行が推奨されるタイミング:
- `src/background.ts` / `public/manifest.json` を変更したとき(必須)
- `src/hooks/useDragReorder.ts` / `src/utils/chromeMock.ts` を変更したとき
- ストア公開前(/store-publish の前提チェックとして)
