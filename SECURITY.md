# セキュリティポリシー / Security Policy

## 脆弱性の報告 / Reporting Vulnerabilities

脆弱性を発見された場合は、`security` ラベルを付けてGitHub Issueを作成してください。
機密性の高い問題については、メンテナーに直接ご連絡ください。

If you discover a security vulnerability, please open a GitHub issue with the label `security`.
For sensitive issues, please contact the maintainer directly.

---

## セキュリティアーキテクチャ / Security Architecture

### ネットワークポリシー / Network Policy

SyncGridは、テレメトリ・アナリティクス・トラッキング目的のネットワークリクエストを**一切送信しません**。

ネットワーク通信が発生するのは、以下のケースのみです:

- **AIタイトル生成（オプション・デフォルト無効）**: ユーザーが明示的にAIプロバイダを設定した場合のみ、以下のAPIにリクエストを送信します
  - OpenAI API (`https://api.openai.com/`)
  - Gemini API (`https://generativelanguage.googleapis.com/`)

AI機能を使用しない場合、SyncGridは完全にオフラインで動作します。

SyncGrid sends **no network requests** for telemetry, analytics, or tracking purposes.

Network communication occurs only in the following case:

- **AI title generation (optional, disabled by default)**: When the user explicitly configures an AI provider, requests are sent to:
  - OpenAI API (`https://api.openai.com/`)
  - Gemini API (`https://generativelanguage.googleapis.com/`)

Without AI features enabled, SyncGrid operates fully offline.

### Content Security Policy (CSP)

```
script-src 'self';
object-src 'none';
base-uri 'none';
form-action 'none';
```

これにより以下が保証されます:
- バンドル済みスクリプトのみ実行可能（インライン・eval・リモート不可）
- プラグインコンテンツ不可（Flash, Java等）
- baseタグハイジャック不可
- 外部エンドポイントへのフォーム送信不可

### 権限（最小権限の原則） / Permissions (Minimum Privilege)

| 権限 | 理由 |
|------|------|
| `bookmarks` | Chromeブックマークの読み書き |
| `storage` | 設定のローカル保存 |
| `favicon` | サイトファビコンの表示 |

| host_permissions | 理由 |
|------------------|------|
| `https://api.openai.com/*` | AIタイトル生成（オプション） |
| `https://generativelanguage.googleapis.com/*` | AIタイトル生成（オプション） |

`tabs`, `webRequest`, `activeTab`, `<all_urls>` 等の広範な権限は使用していません。

### データ保存先 / Data Storage

| 保存先 | データ | スコープ |
|--------|--------|----------|
| Chrome Bookmarks API | ブックマークツリー | Chrome Sync経由で同期可能 |
| chrome.storage.local | 設定、AIキー、メタデータ | ローカルのみ |
| IndexedDB | File Systemハンドル | ローカルのみ（フォルダ同期用） |

### インポート検証パイプライン / Import Validation Pipeline

インポートされるデータは、以下の多段階検証を通過します:

```
ファイル → サイズチェック（10MB以下）
        → JSON.parse（evalなし）
        → スキーマ検証（version, appName, 構造）
        → 再帰的型チェック（最大深度: 10）
        → URLプロトコル許可リスト（http, https, ftp, chrome, file）
        → SHA-256チェックサム検証
        → 文字列サニタイズ（制御文字除去）
        → サイズ制限（タイトル: 512文字, URL: 2048文字）
        → Chrome Bookmarksにインポート
```

いずれかのステップで失敗した場合、インポート全体が拒否されます。

### ローカルフォルダ同期のセキュリティ / Local Folder Sync Security

- **File System Access API** を使用（ブラウザネイティブの許可ダイアログが必要）
- セッションごとにユーザーの明示的な許可が必要
- ディレクトリハンドルはIndexedDBに保存（ブラウザ管理、エクスポート不可）
- 選択されたディレクトリに `syncgrid-sync.json` **のみ**書き込み
- ディレクトリ内の他のファイルは読み取らない
- 親ディレクトリへのトラバーサルは行わない
- アトミック書き込みパターン（tmp → final）で破損を防止

### URL サニタイズ / URL Sanitization

以下のURLプロトコルのみ許可されます:

- `http:`
- `https:`
- `ftp:`
- `chrome:`
- `chrome-extension:`
- `file:`

その他（`javascript:`, `data:`, `blob:`, `vbscript:` 等）はすべて拒否されます。

### 文字列サニタイズ / String Sanitization

インポートされる全文字列に対して:
1. 型チェック（`typeof === 'string'`）
2. 制御文字の除去（U+0000-U+0008, U+000B, U+000C, U+000E-U+001F, U+007F）
3. 最大長での切り詰め
4. コードベース内に `eval()`, `innerHTML`, `document.write()` は存在しない

### AI API通信のセキュリティ / AI API Communication Security

- AI機能はデフォルトで無効。ユーザーが明示的に設定した場合のみ有効化
- APIキーは `chrome.storage.local` に保存（デバイスから外に出ない）
- 送信データはURLのみ（ブックマークの全データは送信しない）
- レスポンスはタイトル文字列としてのみ使用
- AI APIのエンドポイントは `manifest.json` の `host_permissions` で限定

---

## 脅威モデル / Threat Model

| 脅威 | 緩和策 |
|------|--------|
| 悪意あるインポートファイル | スキーマ検証 + チェックサム + URL許可リスト |
| タイトル/URLによるXSS | innerHTML不使用; Reactの組み込みエスケープ |
| 同期によるディレクトリトラバーサル | File System Access APIがブラウザサンドボックスで制限 |
| サプライチェーン攻撃 | ランタイム依存はReactのみ |
| データの外部流出 | テレメトリなし; CSPが外部リクエストをブロック |
| ブックマークデータの改ざん | SHA-256完全性チェック |
| AIキーの漏洩 | chrome.storage.localに保存（拡張機能スコープ内のみアクセス可能） |
