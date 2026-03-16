---
description: ビルド・テスト・Lint一括チェック
---

以下のコマンドを順番に実行し、全て成功することを確認してください:

1. `npm run build` — TypeScriptチェック + Viteビルド
2. `npm run test:run` — 全テスト実行
3. `npm run lint` — ESLintチェック

1つでも失敗した場合は、エラー内容を分析して修正してください。
全て成功した場合は、ビルドサイズと結果のサマリーを報告してください。
