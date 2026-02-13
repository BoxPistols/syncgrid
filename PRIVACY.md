# プライバシーポリシー / Privacy Policy

**最終更新 / Last updated: 2026-02-14**

---

## 日本語

### データ収集

SyncGridは**一切のデータを収集しません**。

- アナリティクスやテレメトリなし
- 使用状況の追跡なし
- 個人情報の収集なし
- Cookieやローカルトラッキングなし
- トラッキング目的のネットワークリクエストなし
- サードパーティのスクリプトやサービスなし

### データの保存場所

すべてのデータはお使いのデバイスにローカル保存されます。

| 保存先 | データ | 備考 |
|--------|--------|------|
| Chrome Bookmarks API | ブックマーク | Chrome同期を有効にしている場合、Chromeアカウント経由で同期される場合があります。これはChromeの機能であり、SyncGridの機能ではありません |
| chrome.storage.local | 設定、AIキー | デバイスから外に出ません |
| IndexedDB | 同期フォルダハンドル | デバイスから外に出ません |

### ローカルフォルダ同期

ローカルフォルダ同期を有効にした場合:

- SyncGridは**ユーザーが明示的に選択したフォルダ**に**1つのファイル**（`syncgrid-sync.json`）のみを書き込みます
- そのフォルダ内の他のファイルを読み取ることはありません
- 選択されていないフォルダにアクセスすることは一切ありません
- フォルダがクラウドサービス（Google Drive, OneDrive等）と同期されている場合、そのファイルのコピーにはクラウドサービスのプライバシーポリシーが適用されます

### エクスポートファイル

エクスポートされたJSONファイルにはブックマークデータがプレーンテキストで含まれます。**暗号化されていません**。安全な場所に保管し、機密性の高いURLが含まれる場合は共有しないでください。

### AIタイトル生成

AIタイトル生成機能はデフォルトで**無効**です。有効にした場合:

- ユーザーが入力したURLのみがAI APIに送信されます
- ブックマークの全データが送信されることはありません
- APIキーは `chrome.storage.local` に保存され、SyncGrid以外からアクセスできません
- 通信先は以下のいずれかのみです:
  - OpenAI API（`https://api.openai.com/`）
  - Gemini API（`https://generativelanguage.googleapis.com/`）
- AI APIのプライバシーポリシーは各プロバイダのものが適用されます

### サードパーティサービス

AI機能を除き、SyncGridはサードパーティサービスを**一切使用しません**。ファビコン表示にはChromeの組み込みファビコン機能（`chrome-extension://` プロトコル）を使用しており、外部サーバーへの通信は発生しません。

### オープンソース

SyncGridは完全にオープンソースです。これらの主張を確認するために、すべてのコードを監査できます。

---

## English

### Data Collection

SyncGrid collects **no data whatsoever**.

- No analytics or telemetry
- No usage tracking
- No personal information collection
- No cookies or local tracking
- No network requests for tracking purposes
- No third-party scripts or services

### Data Storage

All data is stored locally on your device.

| Storage | Data | Notes |
|---------|------|-------|
| Chrome Bookmarks API | Bookmarks | May sync via your Chrome account if Chrome Sync is enabled -- this is a Chrome feature, not SyncGrid |
| chrome.storage.local | Settings, AI keys | Never leaves your device |
| IndexedDB | Sync folder handle | Never leaves your device |

### Local Folder Sync

When you enable local folder sync:

- SyncGrid writes **one file** (`syncgrid-sync.json`) to the folder **you explicitly choose**
- SyncGrid never reads other files in that folder
- SyncGrid never accesses any folder you have not explicitly selected
- If this folder is synced by a cloud service (Google Drive, OneDrive, etc.), that cloud service's privacy policy applies to that copy of the file

### Export Files

Exported JSON files contain your bookmark data in plain text. These files are **not encrypted**. Please store them securely and do not share them if they contain sensitive URLs.

### AI Title Generation

The AI title generation feature is **disabled by default**. When enabled:

- Only the URL entered by the user is sent to the AI API
- Your full bookmark data is never transmitted
- API keys are stored in `chrome.storage.local` and are not accessible outside SyncGrid
- Communication is limited to:
  - OpenAI API (`https://api.openai.com/`)
  - Gemini API (`https://generativelanguage.googleapis.com/`)
- The AI provider's own privacy policy applies to data sent to their API

### Third-Party Services

Aside from the optional AI feature, SyncGrid uses **no** third-party services. Favicon display uses Chrome's built-in favicon capability (`chrome-extension://` protocol), which does not involve external server communication.

### Open Source

SyncGrid is fully open source. You can audit every line of code to verify these claims.
