---
name: プロジェクト現状
description: SyncGrid v1.2.0 の開発状況と次のステップ
type: project
---

## 現在のバージョン: v1.2.0

## 完了済み機能
- Speed Dial UI（カード/リスト/コンパクト3レイアウト）
- カードサイズ切替（S/M/L）
- ドラッグ＆ドロップ（カード並替え・タブ移動・タブ並替え・複数選択一括移動）
- 検索、ソート（名前/日付/ドメイン/最終閲覧）
- タグ機能（手動追加・AI自動タグ・タグフィルタ）
- 閲覧ステータス（未読/既読/後で読む/お気に入り）+フィルター
- OGPプレビュー（ホバーtooltip）
- ゴミ箱（30日保持・復元・完全削除）
- AIタイトル生成・整理（OpenAI/Gemini BYOK）
- ページタイトル自動取得（optional_host_permissions）
- エクスポート/インポート（JSON + Chromeブックマーク取込）
- ローカルフォルダ同期
- キーボードショートカット（カスタマイズ可能）
- オンボーディングツアー・ウェルカムスクリーン
- SVGアイコン統一（Iconコンポーネント27種）
- Draculaダークテーマ（melta-ui原則適用済み）
- ALLタブ（全ブックマーク横断表示）
- a11y基本対応（aria属性・フォーカストラップ・IME対応）
- 日英バイリンガル（151キー同期）

## P0: 次のステップ（品質改善）
1. App.tsx分割（1,110行→600行、カスタムフック抽出）
2. BookmarkCard/FolderCardのReact.memo化
3. sortItems/filterItemsのuseMemo化
4. フック層ユニットテスト追加

## 競合分析済み（2026-03-16）
Raindrop.io, Toby, Speed Dial 2, Start.me, Markify, Marqly, Pocket, Linkwarden, Karakeep

## Chrome Web Store
- v1.2.0 zip生成済み
- プライバシーポリシー: https://boxpistols.github.io/syncgrid/privacy-policy.html
- 審査待ち（スクリーンショット撮影がユーザー操作）
