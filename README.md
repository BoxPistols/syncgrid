<div align="center">

# ⚡ SyncGrid

**Secure Bookmark Dashboard for New Tabs**

[日本語](#日本語) | [English](#english)

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)
![License](https://img.shields.io/badge/License-MIT-blue)
![Security](https://img.shields.io/badge/Security-Zero%20Telemetry-brightgreen)

</div>

---

## English

### What is SyncGrid?

SyncGrid replaces Chrome's new tab with a beautiful Speed Dial bookmark manager. Organize bookmarks into tabbed groups, navigate folders visually, and keep everything synced via local folder backup.

### Features

| Feature | Description |
|---------|-------------|
| **Speed Dial UI** | Visual card grid with folders and bookmarks |
| **Tab Navigation** | Top-level groups as horizontal tabs |
| **Folder Drill-down** | Click folders to navigate, breadcrumb to go back |
| **Search** | Instant search across all bookmarks |
| **Dark / Light / System** | Full theme support |
| **Export / Import** | JSON backup with SHA-256 integrity verification |
| **Local Folder Sync** | Auto-sync to any local folder (Google Drive, OneDrive, iCloud, Dropbox, Box…) |
| **Bilingual** | Japanese (default) and English UI |
| **Context Menus** | Right-click to edit, rename, delete |
| **Inline Rename** | Double-click tabs to rename groups |

### Installation

1. Download or clone this repository
2. Run `npm install && npm run build`
3. Open `chrome://extensions/`
4. Enable **Developer mode**
5. Click **Load unpacked** → select the `dist/` folder

### Cloud Sync — How It Works

SyncGrid doesn't connect to any cloud API directly. Instead, it uses the **File System Access API** to write a backup file to a local folder of your choice.

**Setup:**
1. Open Settings (⚙️ icon)
2. Click **Select folder**
3. Choose a folder synced by your cloud drive:
   - Google Drive → `~/Google Drive/SyncGrid/`
   - OneDrive → `~/OneDrive/SyncGrid/`
   - iCloud Drive → `~/Library/Mobile Documents/com~apple~CloudDocs/SyncGrid/`
   - Dropbox → `~/Dropbox/SyncGrid/`
   - Box → `~/Box/SyncGrid/`

**Behavior:**
- Auto-syncs every 5 minutes and on every bookmark change (debounced 3s)
- Writes `syncgrid-sync.json` — a standard SyncGrid export file
- Can be imported on any other machine running SyncGrid
- One-click **Sync Now** button for manual sync

### Data Safety

> **Your bookmarks are precious. SyncGrid treats them that way.**

| Concern | How SyncGrid Addresses It |
|---------|--------------------------|
| **Data loss** | Export/import with SHA-256 checksum verification |
| **Corruption** | JSON schema validation on import; malformed data rejected |
| **Cloud sync** | Writes only to user-selected folder; no OAuth, no API keys |
| **Privacy** | Zero telemetry, zero analytics, zero network requests |
| **XSS** | URL protocol allowlist (`http:`, `https:`, `ftp:`, `chrome:`, `file:`) |
| **Injection** | All strings sanitized; control characters stripped |
| **Size limits** | Max 10MB import, 512-char titles, 2048-char URLs, 10-level nesting |
| **CSP** | `script-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'` |

### Tech Stack

- React 19 + TypeScript
- Vite 7
- Chrome Extensions Manifest V3
- Chrome Bookmarks API + Storage API
- File System Access API
- Zero external dependencies at runtime

---

## 日本語

### SyncGridとは？

SyncGridは、Chromeの新しいタブをSpeed Dialスタイルのブックマークマネージャーに置き換える拡張機能です。タブ分けされたグループでブックマークを整理し、フォルダをビジュアルにナビゲートし、ローカルフォルダを通じてクラウドと同期できます。

### 機能一覧

| 機能 | 説明 |
|------|------|
| **Speed Dial UI** | フォルダとブックマークのカードグリッド表示 |
| **タブナビゲーション** | トップレベルグループを水平タブで切り替え |
| **フォルダドリルダウン** | フォルダをクリックして中に入り、パンくずで戻る |
| **検索** | 全ブックマークを横断する即座検索 |
| **テーマ** | ダーク / ライト / システム連動 |
| **エクスポート / インポート** | SHA-256チェックサム検証付きJSONバックアップ |
| **ローカルフォルダ同期** | Google Drive, OneDrive, iCloud, Dropbox, Box等と自動同期 |
| **バイリンガル** | 日本語（デフォルト）と英語のUI |
| **コンテキストメニュー** | 右クリックで編集・名前変更・削除 |
| **インラインリネーム** | タブをダブルクリックでグループ名変更 |

### インストール

1. このリポジトリをダウンロードまたはクローン
2. `npm install && npm run build` を実行
3. `chrome://extensions/` を開く
4. **デベロッパーモード** を有効化
5. **パッケージ化されていない拡張機能を読み込む** → `dist/` フォルダを選択

### クラウド同期 — 仕組み

SyncGridはクラウドAPIに直接接続しません。代わりに **File System Access API** を使用して、ユーザーが選択したローカルフォルダにバックアップファイルを書き込みます。

**設定手順:**
1. 設定を開く（⚙️アイコン）
2. **フォルダを選択** をクリック
3. クラウドドライブが同期しているフォルダを選択:
   - Google Drive → `~/Google Drive/SyncGrid/`
   - OneDrive → `~/OneDrive/SyncGrid/`
   - iCloud Drive → `~/Library/Mobile Documents/com~apple~CloudDocs/SyncGrid/`
   - Dropbox → `~/Dropbox/SyncGrid/`
   - Box → `~/Box/SyncGrid/`

**動作:**
- 5分ごと＋ブックマーク変更時に自動同期（3秒デバウンス）
- `syncgrid-sync.json` を書き出し — 標準SyncGridエクスポート形式
- 他のPCのSyncGridでインポート可能
- **今すぐ同期** ボタンで手動同期も可能

### データの安全性

> **あなたのブックマークは大切な資産です。SyncGridはそれにふさわしい扱いをします。**

| 懸念事項 | SyncGridの対策 |
|----------|---------------|
| **データ喪失** | SHA-256チェックサム検証付きエクスポート/インポート |
| **データ破損** | インポート時にJSONスキーマ検証。不正データは拒否 |
| **クラウド同期** | ユーザーが選択したフォルダにのみ書き込み。OAuth不要、APIキー不要 |
| **プライバシー** | テレメトリゼロ、アナリティクスゼロ、外部通信ゼロ |
| **XSS対策** | URLプロトコルの許可リスト制（`http:`, `https:`, `ftp:`, `chrome:`, `file:`） |
| **インジェクション対策** | 全文字列をサニタイズ。制御文字を除去 |
| **サイズ制限** | インポート最大10MB、タイトル512文字、URL 2048文字、ネスト10階層 |
| **CSP** | `script-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'` |

### セキュリティ方針

SyncGridは「ゼロトラスト・ゼロテレメトリ」の原則に基づいて設計されています:

1. **外部通信なし** — ネットワークリクエストを一切送信しません
2. **Chrome APIのみ** — データはChrome Bookmarks APIとchrome.storage.localにのみ保存
3. **ユーザー起点の同期** — ローカルフォルダ同期はユーザーが明示的に許可したフォルダにのみ書き込み
4. **完全性検証** — エクスポートファイルにはSHA-256チェックサムが含まれ、インポート時に検証
5. **入力検証** — 全てのインポートデータにスキーマ検証、URL許可リスト、サイズ制限を適用
6. **Manifest V3 CSP** — インラインスクリプト禁止、外部スクリプト禁止
7. **暗号化なし（意図的）** — エクスポートファイルは暗号化されていません。安全な場所に保管してください

### 技術スタック

- React 19 + TypeScript
- Vite 7
- Chrome Extensions Manifest V3
- Chrome Bookmarks API + Storage API
- File System Access API
- ランタイムの外部依存ゼロ

---

## Contributing

Contributions welcome! Please open an issue or PR.

## License

MIT — see [LICENSE](./LICENSE)
