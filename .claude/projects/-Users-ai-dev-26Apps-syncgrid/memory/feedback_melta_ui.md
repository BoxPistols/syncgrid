---
name: melta-ui設計原則の適用
description: UI設計でmelta-uiの考え方を取り込む指示。Layered/Contrast/Semantic/Minimal/Grid原則。
type: feedback
---

SyncGridのUI設計にmelta-ui（https://github.com/tsubotax/melta-ui）の原則を適用する。

**Why:** 競合に対してグローバルに使いやすいUI/UXで差別化するため。

**How to apply:**
1. **Layered** — Background → Surface → Text/Object の3層構造を意識
2. **Contrast** — WCAG 2.1準拠（テキスト/背景 4.5:1以上）
3. **Semantic** — CSS変数は用途ベース命名（`--sg-bg-card`等、既に適用済み）
4. **Minimal** — 1ビュー3色まで（背景・アクセント・テキスト）
5. **Grid** — スペーシングは4の倍数基本、8の倍数推奨
6. **禁止パターン** — shadow-lg/2xl禁止、border-l-4禁止、色だけで情報伝達禁止
7. **アイコン** — aria-label必須、アイコンボタンには必ずラベル
