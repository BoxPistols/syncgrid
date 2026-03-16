---
description: melta-ui原則に基づくデザインレビュー
---

src/styles/global.css を読み、以下のmelta-ui設計原則に照らしてレビューしてください:

1. **Layered** — Background → Surface → Text/Object の3層構造
2. **Contrast** — WCAG 2.1準拠（テキスト/背景 4.5:1以上）
3. **Semantic** — 色は用途ベース命名（生の色名禁止）
4. **Minimal** — 1ビュー3色まで（背景・アクセント・テキスト）
5. **Grid** — スペーシング4の倍数基本、8の倍数推奨
6. **禁止パターン** — shadow-lg/2xl禁止、border-l-4禁止、色だけで情報伝達禁止
7. **アイコン** — aria-label必須

違反箇所をファイル名:行番号で報告し、修正案を提示してください。
