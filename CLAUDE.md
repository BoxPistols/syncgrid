# SyncGrid

Chrome新規タブをSpeed Dialブックマークマネージャーに置き換えるChrome拡張機能。
React 19 + TypeScript Strict + Vite 7 + Manifest V3。ランタイム依存はReactのみ。

## コードスタイル

- TypeScript Strict。`any` 禁止
- named export を使用（default export は使わない）
- CSS は `src/styles/global.css` のカスタムプロパティ（デザイントークン）のみ使用。インラインスタイル禁止
- ユーザー向け文字列は必ず `src/i18n/ja.ts` と `src/i18n/en.ts` の両方に追加（キー数・関数シグネチャを完全同期。`/i18n-check` で検証）
- コンポーネントは関数型のみ。クラスコンポーネント禁止
- Chrome API のモックは `src/utils/chromeMock.ts` を使用
- アイコンは `src/components/Icon.tsx` の SVGアイコンコンポーネントを使用。絵文字禁止
- パフォーマンス: リスト描画コンポーネントは `React.memo` を適用
- IME対応: 全てのEnterキーハンドラに `isComposing()` チェック必須

## コマンド

- `npm run dev` -- 開発サーバー起動（Vite HMR）
- `npm run build` -- TypeScriptチェック + Viteビルド → `dist/`
- `npm run zip` -- ビルド後にzip作成（配布用）
- `npm run lint` -- ESLint実行
- `npm run test` -- Vitest（watchモード）
- `npm run test:run` -- Vitest（1回実行、CI向け）
- `npm run e2e:smoke` -- 実ビルド拡張のE2Eスモーク（要 `npm run build`。headless Chrome for Testing + CDP）

## Claude Codeカスタムコマンド

- `/build-check` -- ビルド・テスト・Lint一括チェック
- `/design-review` -- melta-ui原則に基づくデザインレビュー
- `/e2e-check` -- 実ビルド拡張のE2Eスモーク（実機依存の退行検出）
- `/i18n-check` -- i18nキーの一貫性チェック
- `/perf-audit` -- パフォーマンス監査（再レンダリング・メモ化）
- `/store-publish` -- Chrome Web Store公開準備チェック

## アーキテクチャ

- `src/components/` -- Reactコンポーネント（UI層）
- `src/hooks/` -- カスタムフック（状態管理、Chrome API連携）
- `src/context/` -- React Context（I18nContext: t/locale の配布のみ。drag状態・選択状態はContext化しない）
- `src/utils/` -- ビジネスロジック（データ変換、検証、API呼び出し）
- `src/types/index.ts` -- 全型定義とデフォルト値
- `src/i18n/` -- 国際化（ja.ts, en.ts, index.ts）
- `src/styles/global.css` -- デザイントークンとテーマ定義（melta-ui原則準拠）
- `manifest.config.ts` -- Chrome拡張マニフェストの唯一の定義元（Manifest V3。version は package.json から）

データソースは Chrome Bookmarks API が唯一の信頼源。独自DBは持たない。
メタデータ（タグ、OGPキャッシュ、閲覧ステータス）は `chrome.storage.local` に保存。
Kanban は `chrome.storage.local`（主）+ `chrome.storage.sync`（ミラー）に board 単位の
last-write-wins（`updatedAt`）で保存。

## 実機依存の鉄則（テストが通っても実機で壊れる領域）

- **bookmarks.move の index は「移動前リスト上の挿入位置」解釈**（同一親内の前方移動は
  Chrome 内部で -1 補正。2026-07 実測）。呼び出し側で補正しない。
  `src/utils/__tests__/chromeMock.test.ts` のパリティテスト（実測表11ケース）が mock と
  実機の整合を守る。**mock の move を変更するときはこのテストを緩めない**
- **`src/background.ts` に import を書く場合、manifest の background に `"type": "module"` が必須**。
  ないとビルド後の import 文で service worker が黙って死に、全メッセージが無応答になる。
  background / manifest を変更したら `/e2e-check` を必ず実行
- フックの単体テストは `src/hooks/__tests__/` の Harness パターン
  （createRoot + act + `createMockChrome(seed)` 差し込み）を踏襲する

## UI設計原則（melta-ui準拠）

1. **Layered** — Background → Surface → Text/Object の3層構造
2. **Contrast** — WCAG 2.1準拠（テキスト/背景 4.5:1以上）
3. **Semantic** — CSS変数は用途ベース命名（`--sg-bg-card`等）
4. **Minimal** — 1ビュー3色まで（背景・アクセント・テキスト）
5. **Grid** — スペーシングは4の倍数基本、8の倍数推奨
6. **禁止パターン** — shadow-lg/2xl禁止、border-l-4禁止、色だけで情報伝達禁止

## 注意事項

- **ゼロテレメトリ原則**: テレメトリ・アナリティクス・トラッキング目的の外部通信は絶対に追加しない
- **ランタイム依存の追加禁止**: React以外のランタイム依存を追加しない。devDependenciesは可
- AI API通信（OpenAI / Gemini）はユーザーが明示的に設定した場合のみ
- `host_permissions` は AI API のみ許可。`optional_host_permissions` はタイトル/OGP取得用
- インポートデータは必ず多段階検証パイプライン（`src/utils/dataTransfer.ts`）を通す
- テーマ切り替えは `data-theme` 属性 + CSS変数で行う。JS側でスタイルを直接操作しない
- `.github/workflows/` はOAuthスコープ制約により通常の `git push` では反映されない
- コミットメッセージは日本語で簡潔に。絵文字・Co-Authored-By不要
