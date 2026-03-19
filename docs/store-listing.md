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
This extension replaces Chrome's new tab page with a Speed Dial bookmark dashboard that lets users visually organize, search, and manage their bookmarks.

### Host permission justification
host_permissions for api.openai.com and generativelanguage.googleapis.com are required for the optional AI-assisted bookmark title generation and auto-tagging feature. These endpoints are contacted only when ALL of the following conditions are met: (1) the user has manually entered their own API key in the extension's settings, (2) the user explicitly triggers the AI title generation or auto-tagging action on a specific bookmark. No API calls are made at any other time. No user data, browsing history, or personal information is ever transmitted — only the bookmark URL and existing title are sent to generate an improved title or tags. API keys are stored exclusively in chrome.storage.local and are never synced or shared.

### Optional host permission justification
optional_host_permissions for https://*/* and http://*/* are required to fetch page titles and Open Graph (OGP) metadata (title, description, image URL) from bookmarked websites. This is implemented via a background service worker that makes a single GET request to the bookmarked URL and parses the HTML response for meta OGP tags. This permission is: (1) requested at runtime via chrome.permissions.request() only when the user first initiates the metadata fetch feature, (2) scoped to fetching HTML content from URLs the user has explicitly bookmarked, (3) revocable at any time through Chrome's extension permissions UI. No content scripts are injected. No data is collected, stored remotely, or transmitted to any third party.

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
