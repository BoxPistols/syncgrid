# Chrome Web Store — Listing Content

## Short Description (max 132 characters)

### English
Speed Dial bookmark manager for new tabs — organize, search & sync your bookmarks with a clean dashboard UI

### Japanese
新規タブをSpeed Dialブックマークマネージャーに — 整理・検索・同期を美しいダッシュボードUIで

---

## Detailed Description

### English

SyncGrid replaces your Chrome new tab page with a fast, beautiful Speed Dial bookmark dashboard.

**Features:**
- Organize bookmarks into folders and groups with drag & drop
- Accordion folder sections — see folder contents inline without navigating, expand/collapse individually or all at once
- Search bookmarks instantly from the top bar
- Light / Dark / System theme with smooth transitions
- Japanese & English interface
- Export & import bookmarks as JSON
- Local folder sync — back up to Google Drive, OneDrive, iCloud, or Dropbox via a local synced folder
- 3 layouts: Magazine (grid), Card (large), List (rows) — switch with ⌘1/2/3
- Rich OGP previews — images, descriptions, site info fetched via background service worker
- Tags & filtering — organize bookmarks with tags, filter by tag or read status
- Sort by name, date, domain, or last read
- AI-powered title generation & auto-tagging (optional) — bring your own OpenAI or Gemini API key
- Dedicated keyboard shortcuts panel with customizable bindings
- Built-in help panel with feature overview and security info
- Bulk select & delete with Cmd/Ctrl+Click
- Cross-folder drag & drop — move bookmarks between folders seamlessly

**Privacy first:**
- Zero telemetry — no analytics, no tracking, no external data collection
- All data stored locally in Chrome's bookmark storage
- AI API keys stored on-device only, never synced
- No third-party scripts or advertising
- Open source: github.com/BoxPistols/syncgrid

**Permissions:**
- Bookmarks: manage your Speed Dial bookmarks
- Storage: save your preferences locally
- Favicon: display website icons
- Host permissions (api.openai.com, generativelanguage.googleapis.com): optional AI title generation only

### Japanese

SyncGrid は Chrome の新規タブページを高速で美しい Speed Dial ブックマークダッシュボードに置き換えます。

**機能:**
- ドラッグ＆ドロップでブックマークをフォルダ・グループに整理
- アコーディオン型フォルダセクション — フォルダの中身をインラインで可視化、個別/一括で展開・折りたたみ
- トップバーからブックマークを即座に検索
- ライト / ダーク / システムテーマ（滑らかなトランジション）
- 日本語・英語対応
- JSON形式でブックマークのエクスポート＆インポート
- ローカルフォルダ同期 — Google Drive, OneDrive, iCloud, Dropbox 等のクラウドフォルダ経由でバックアップ
- 3つのレイアウト: マガジン（グリッド）/ カード（大）/ リスト（横長行）— ⌘1/2/3で切替
- リッチOGPプレビュー — background service worker経由でOGP画像・説明・サイト情報を自動取得
- タグ＆フィルタリング — タグでブックマークを整理、タグ・閲覧状態で絞り込み
- 名前・日付・ドメイン・最終閲覧順でソート
- AI タイトル自動生成＆自動タグ付け（オプション）— OpenAI / Gemini API キーで利用
- 専用キーボードショートカット設定パネル（カスタマイズ可能）
- ヘルプパネル内蔵（機能概要・セキュリティ情報）
- 複数選択＆一括削除（Cmd/Ctrl+Click）
- フォルダ間ドラッグ＆ドロップ — 異なるフォルダ間でブックマークをシームレスに移動

**プライバシー重視:**
- ゼロテレメトリ — アナリティクス、トラッキング、外部データ収集一切なし
- 全データは Chrome のブックマークストレージにローカル保存
- AI API キーはデバイス上のみに保存、同期されません
- サードパーティスクリプト・広告なし
- オープンソース: github.com/BoxPistols/syncgrid

---

## Category
Productivity

## Language
English, Japanese

## Privacy Practices Tab

### Single purpose description
Replace the new tab page with a Speed Dial bookmark dashboard for organizing, searching, and syncing bookmarks.

### Host permission justification
host_permissions for api.openai.com and generativelanguage.googleapis.com are used exclusively for the optional AI title generation and auto-tagging features. These APIs are only contacted when the user explicitly configures their own API key and triggers the feature. No data is sent otherwise.

### Optional host permission justification
optional_host_permissions for https://*/* and http://*/* are used by the background service worker to fetch page titles and OGP (Open Graph Protocol) metadata when users add bookmarks. This permission is requested at runtime only when the user first uses the title auto-fetch feature, and can be revoked at any time.

### Data usage disclosures
- **Personally identifiable information**: No
- **Health information**: No
- **Financial and payment information**: No
- **Authentication information**: No
- **Personal communications**: No
- **Location**: No
- **Web history**: No
- **User activity**: No
- **Website content**: No

---

## Support

SyncGrid is free and open source. If you find it useful:
- GitHub Sponsors: https://github.com/sponsors/BoxPistols
