# Privacy Policy / プライバシーポリシー

**Last updated / 最終更新: 2026-02-11**

## English

### Data Collection

SyncGrid collects **no data whatsoever**.

- ❌ No analytics or telemetry
- ❌ No usage tracking
- ❌ No personal information collection
- ❌ No cookies or local tracking
- ❌ No network requests to any server
- ❌ No third-party scripts or services

### Data Storage

All data is stored locally on your device:

- **Bookmarks**: Stored via Chrome Bookmarks API (may sync via your Chrome account if you have Chrome Sync enabled — this is a Chrome feature, not SyncGrid)
- **Settings**: Stored in `chrome.storage.local` (never leaves your device)
- **Sync folder handle**: Stored in IndexedDB (never leaves your device)

### Local Folder Sync

When you enable local folder sync:
- SyncGrid writes **one file** (`syncgrid-sync.json`) to the folder **you explicitly choose**
- SyncGrid never reads other files in that folder
- SyncGrid never accesses any folder you have not explicitly selected
- If this folder is synced by a cloud service (Google Drive, OneDrive, etc.), that cloud service's privacy policy applies to that copy of the file

### Export Files

Exported JSON files contain your bookmark data in plain text. These files are **not encrypted**. Please store them securely and do not share them if they contain sensitive URLs.

### Third-Party Services

SyncGrid uses **no** third-party services. The only external resource accessed is Google's favicon service (`chrome-extension://` protocol) for displaying website icons, which is handled natively by Chrome.

### Open Source

SyncGrid is fully open source. You can audit every line of code to verify these claims.

---

## 日本語

### データ収集

SyncGridは**一切のデータを収集しません**。

- ❌ アナリティクスやテレメトリなし
- ❌ 使用状況の追跡なし
- ❌ 個人情報の収集なし
- ❌ Cookieやローカルトラッキングなし
- ❌ サーバーへのネットワークリクエストなし
- ❌ サードパーティのスクリプトやサービスなし

### データの保存場所

すべてのデータはお使いのデバイスにローカル保存されます:

- **ブックマーク**: Chrome Bookmarks APIに保存（Chrome同期を有効にしている場合、Chromeアカウント経由で同期される場合があります — これはChromeの機能であり、SyncGridの機能ではありません）
- **設定**: `chrome.storage.local`に保存（デバイスから外に出ません）
- **同期フォルダハンドル**: IndexedDBに保存（デバイスから外に出ません）

### ローカルフォルダ同期

ローカルフォルダ同期を有効にした場合:
- SyncGridは**ユーザーが明示的に選択したフォルダ**に **1つのファイル**（`syncgrid-sync.json`）のみを書き込みます
- そのフォルダ内の他のファイルを読み取ることはありません
- 選択されていないフォルダにアクセスすることは一切ありません
- フォルダがクラウドサービス（Google Drive, OneDrive等）と同期されている場合、そのファイルのコピーにはクラウドサービスのプライバシーポリシーが適用されます

### エクスポートファイル

エクスポートされたJSONファイルにはブックマークデータがプレーンテキストで含まれます。**暗号化されていません**。安全な場所に保管し、機密性の高いURLが含まれる場合は共有しないでください。

### サードパーティサービス

SyncGridはサードパーティサービスを**一切使用しません**。アクセスする唯一の外部リソースは、ウェブサイトアイコン表示のためのGoogleファビコンサービス（`chrome-extension://`プロトコル）であり、これはChromeによってネイティブに処理されます。

### オープンソース

SyncGridは完全にオープンソースです。これらの主張を確認するために、すべてのコードを監査できます。
