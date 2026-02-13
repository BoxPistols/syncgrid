# SyncGrid

Chrome新規タブをSpeed Dialブックマークマネージャーに置き換えるChrome拡張機能。
React 19 + TypeScript Strict + Vite 7 + Manifest V3。ランタイム依存はReactのみ。

## コードスタイル

- TypeScript Strict。`any` 禁止
- named export を使用（default export は使わない）
- CSS は `src/styles/global.css` のカスタムプロパティ（デザイントークン）のみ使用。インラインスタイル禁止
- ユーザー向け文字列は必ず `src/i18n/ja.ts` と `src/i18n/en.ts` の両方に追加
- コンポーネントは関数型のみ。クラスコンポーネント禁止
- Chrome API のモックは `src/utils/chromeMock.ts` を使用

## コマンド

- `npm run dev` -- 開発サーバー起動（Vite HMR）
- `npm run build` -- TypeScriptチェック + Viteビルド → `dist/`
- `npm run zip` -- ビルド後にzip作成（配布用）
- `npm run lint` -- ESLint実行
- `npm run test` -- Vitest（watchモード）
- `npm run test:run` -- Vitest（1回実行、CI向け）

## アーキテクチャ

- `src/components/` -- Reactコンポーネント（UI層）
- `src/hooks/` -- カスタムフック（状態管理、Chrome API連携）
- `src/utils/` -- ビジネスロジック（データ変換、検証、API呼び出し）
- `src/types/index.ts` -- 全型定義とデフォルト値
- `src/i18n/` -- 国際化（ja.ts, en.ts）
- `src/styles/global.css` -- デザイントークンとテーマ定義
- `public/manifest.json` -- Chrome拡張マニフェスト（Manifest V3）

データソースは Chrome Bookmarks API が唯一の信頼源。独自DBは持たない。

## 注意事項

- **ゼロテレメトリ原則**: テレメトリ・アナリティクス・トラッキング目的の外部通信は絶対に追加しない
- **ランタイム依存の追加禁止**: React以外のランタイム依存を追加しない。devDependenciesは可
- AI API通信（OpenAI / Gemini）はユーザーが明示的に設定した場合のみ、タイトル生成に限定
- `host_permissions` は AI API のみ許可。`<all_urls>` や `webRequest` は使わない
- インポートデータは必ず多段階検証パイプライン（`src/utils/dataTransfer.ts`）を通す
- テーマ切り替えは `data-theme` 属性 + CSS変数で行う。JS側でスタイルを直接操作しない
- `.github/workflows/` はOAuthスコープ制約により通常の `git push` では反映されない
