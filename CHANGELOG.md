# Changelog / 変更履歴

All notable changes to SyncGrid will be documented in this file.

## [1.1.0] - 2026-02-11

### Added / 追加
- **Speed Dial UI**: Complete redesign from tree structure to card grid layout
- **Tab Navigation**: Top-level groups displayed as horizontal tabs
- **Folder Drill-down**: Click folders to navigate deeper, breadcrumb to go back
- **Local Folder Sync**: Auto-sync bookmarks to any local folder (Google Drive, OneDrive, iCloud, Dropbox, Box)
- **Export / Import**: JSON backup with SHA-256 integrity verification
- **Bilingual UI**: Japanese (default) and English language support
- **Settings Panel**: Language, theme, data management, sync configuration
- **Context Menus**: Right-click for edit, rename, delete operations
- **Inline Rename**: Double-click tabs to rename groups
- **Auto Sync**: 5-minute interval + debounced sync on bookmark changes
- **Security Documentation**: SECURITY.md, PRIVACY.md with comprehensive security architecture

### Security / セキュリティ
- Zero network requests / ゼロネットワークリクエスト
- SHA-256 checksum verification on import / インポート時SHA-256検証
- URL protocol allowlist / URLプロトコル許可リスト
- Content Security Policy (Manifest V3) / CSP対応
- Import validation pipeline (schema, size, depth limits) / インポート検証パイプライン

## [1.0.0] - 2026-02-11

### Added / 追加
- Initial release / 初回リリース
- Chrome Bookmarks API integration / Chrome Bookmarks API連携
- Dark / Light / System theme / テーマ対応
- Search across all bookmarks / ブックマーク全文検索
- Keyboard navigation / キーボードナビゲーション
