<div align="center">

# SyncGrid

**Chrome新規タブをブックマークダッシュボードに置き換える拡張機能**

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)
![License](https://img.shields.io/badge/License-MIT-blue)
![Security](https://img.shields.io/badge/Security-Zero%20Telemetry-brightgreen)

[日本語](#日本語) | [English](#english)

</div>

---

## 日本語

### SyncGridとは

SyncGridは、Chromeの新しいタブページをSpeed Dialスタイルのブックマークマネージャーに置き換える拡張機能です。カードグリッドUIでブックマークを視覚的に整理し、ローカルフォルダを介してデバイス間の同期を実現します。

テレメトリ・アナリティクス・外部トラッキングは一切行いません。

### 機能一覧

| 機能 | 説明 |
|------|------|
| **Speed Dial UI** | フォルダとブックマークをカードグリッドで表示 |
| **タブナビゲーション** | トップレベルのグループを水平タブで切り替え |
| **フォルダドリルダウン** | フォルダをクリックして中に入り、パンくずリストで戻る |
| **検索** | 全ブックマークのタイトル・URLを横断する即時検索 |
| **テーマ** | ダーク / ライト / システム連動 の3モード |
| **エクスポート / インポート** | SHA-256チェックサム検証付きJSONバックアップ |
| **ローカルフォルダ同期** | Google Drive, OneDrive, iCloud, Dropbox, Box等との自動同期 |
| **AIタイトル生成** | OpenAI / Gemini APIでURLからブックマークタイトルを自動生成（オプション） |
| **バイリンガルUI** | 日本語（デフォルト）と英語 |
| **コンテキストメニュー** | 右クリックで編集・名前変更・削除 |
| **インラインリネーム** | タブのダブルクリックでグループ名を変更 |

### インストール

1. このリポジトリをクローン
2. 依存パッケージをインストールしてビルド
   ```bash
   npm install
   npm run build
   ```
3. Chromeで `chrome://extensions/` を開く
4. **デベロッパーモード** を有効化
5. **パッケージ化されていない拡張機能を読み込む** をクリックし、`dist/` フォルダを選択

### 開発

```bash
npm run dev        # 開発サーバー起動（ホットリロード）
npm run build      # TypeScriptチェック + Viteビルド
npm run zip        # ビルドしてzipパッケージを作成
npm run lint       # ESLintによるコード品質チェック
npm run test       # テスト実行（watchモード）
npm run test:run   # テスト実行（1回のみ）
```

### クラウド同期の仕組み

SyncGridはクラウドAPIに直接接続しません。**File System Access API** を使い、ユーザーが選択したローカルフォルダにバックアップファイルを書き出します。このフォルダをクラウドドライブの同期対象にすることで、間接的にクラウド同期が実現されます。

**設定手順:**
1. 設定パネルを開く
2. 「フォルダを選択」をクリック
3. クラウドドライブが同期しているフォルダを選択:
   - Google Drive: `~/Google Drive/SyncGrid/`
   - OneDrive: `~/OneDrive/SyncGrid/`
   - iCloud Drive: `~/Library/Mobile Documents/com~apple~CloudDocs/SyncGrid/`
   - Dropbox: `~/Dropbox/SyncGrid/`
   - Box: `~/Box/SyncGrid/`

**動作仕様:**
- 5分間隔の定期同期 + ブックマーク変更時の自動同期（3秒デバウンス）
- `syncgrid-sync.json` を書き出し（標準SyncGridエクスポート形式）
- 他のPCのSyncGridでインポート可能
- 「今すぐ同期」ボタンで手動同期も可能

### AIタイトル生成（オプション）

URLからブックマークのタイトルをAIで自動生成する機能です。デフォルトでは無効になっています。

**対応プロバイダ:**
- **OpenAI**: GPT-4.1 Nano / GPT-4.1 Mini / GPT-5 Nano / GPT-5 Mini
- **Gemini**: Gemini 2.0 Flash / Gemini 2.5 Flash / Gemini 2.5 Pro

**設定手順:**
1. 設定パネルでAIプロバイダを選択
2. APIキーを入力
3. 使用するモデルを選択

APIキーは `chrome.storage.local` に保存され、デバイスの外には送信されません。AI APIへのリクエストはタイトル生成時のみ発生します。

### データの安全性

> あなたのブックマークは大切な資産です。SyncGridはそれにふさわしい扱いをします。

| 懸念事項 | SyncGridの対策 |
|----------|---------------|
| **データ喪失** | SHA-256チェックサム検証付きエクスポート/インポート |
| **データ破損** | インポート時のJSONスキーマ検証。不正データは拒否 |
| **クラウド同期** | ユーザーが選択したフォルダにのみ書き込み。OAuth不要 |
| **プライバシー** | テレメトリゼロ、アナリティクスゼロ |
| **XSS対策** | URLプロトコル許可リスト制（http, https, ftp, chrome, file） |
| **インジェクション対策** | 全文字列をサニタイズ。制御文字を除去 |
| **サイズ制限** | インポート最大10MB、タイトル512文字、URL 2048文字、ネスト10階層 |
| **CSP** | `script-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'` |

### 設計コンセプト

SyncGridは3つの設計原則に基づいています。

**1. プライバシーファースト**

ブックマークにはユーザーの興味・関心・行動パターンが詰まっています。SyncGridはこのデータを外部に送信しない「ゼロテレメトリ」を最も重要な設計原則としています。バックエンドサーバーは存在せず、すべてのデータはユーザーのデバイス内で完結します。

**2. Chromeネイティブ統合**

独自のデータベースを持たず、Chrome Bookmarks APIをデータソースとして直接利用します。これにより、Chromeのブックマークバーやブックマークマネージャーとの完全な一貫性が保証されます。SyncGridで作成したブックマークはChromeの標準機能からも見え、その逆も同様です。

**3. 間接同期モデル**

クラウドサービスのAPIと直接連携するのではなく、File System Access APIでローカルフォルダにファイルを書き出す方式を採用しています。クラウドドライブクライアント（Google Drive, OneDrive等）が自動的にそのファイルを同期するため、SyncGridはOAuth認証もAPI鍵もトークンも必要としません。ユーザーが既に信頼しているクラウドサービスの仕組みに乗る設計です。

### アーキテクチャ

#### 全体構成

SyncGridはChrome拡張機能として動作するシングルページアプリケーション（SPA）です。`chrome_url_overrides` で新規タブページを差し替え、React SPAをレンダリングします。

```
┌─────────────────────────────────────────────────────┐
│  Chrome 新規タブ                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  SyncGrid SPA (React + TypeScript)            │  │
│  │                                               │  │
│  │  ┌─────────┐  ┌──────────┐  ┌─────────────┐  │  │
│  │  │ コンポー │  │ カスタム  │  │ ユーティリ  │  │  │
│  │  │ ネント層 │  │ フック層  │  │ ティ層      │  │  │
│  │  └────┬────┘  └────┬─────┘  └──────┬──────┘  │  │
│  │       │            │               │          │  │
│  └───────┼────────────┼───────────────┼──────────┘  │
│          │            │               │             │
│  ┌───────┴────────────┴───────────────┴──────────┐  │
│  │  Chrome APIs / Web APIs                       │  │
│  │  ┌──────────┐ ┌─────────┐ ┌────────────────┐ │  │
│  │  │Bookmarks │ │Storage  │ │File System     │ │  │
│  │  │API       │ │API      │ │Access API      │ │  │
│  │  └──────────┘ └─────────┘ └────────────────┘ │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

#### データフロー

```
Chrome Bookmarks API（信頼できる唯一のデータソース）
        │
        ├──→ useBookmarks フック → コンポーネントに配信
        │       - ブックマークツリーの読み込み
        │       - chrome.bookmarks.onChanged 等でリアルタイム監視
        │
        ├──→ エクスポート
        │       - ブックマークツリー → JSON変換
        │       - SHA-256チェックサム付与
        │       - ファイルダウンロード
        │
        ├──→ インポート
        │       - ファイル読み込み → 多段階検証パイプライン
        │       - 検証通過後にChrome Bookmarks APIへ書き込み
        │
        └──→ ローカルフォルダ同期
                - useAutoSync フックが定期実行
                - File System Access API → ローカルフォルダに書き出し
                - クラウドドライブクライアントが自動同期
```

#### レイヤー構成

| レイヤー | ディレクトリ | 責務 |
|----------|-------------|------|
| **コンポーネント層** | `src/components/` | UI描画、ユーザー操作のハンドリング |
| **フック層** | `src/hooks/` | 状態管理、Chrome APIとの橋渡し、副作用の管理 |
| **ユーティリティ層** | `src/utils/` | 純粋なビジネスロジック（データ変換、検証、API呼び出し） |
| **型定義層** | `src/types/` | アプリケーション全体で共有するインターフェースと定数 |
| **i18n層** | `src/i18n/` | 日本語・英語の翻訳データとロケール切り替え |
| **スタイル層** | `src/styles/` | CSSカスタムプロパティによるデザイントークンとテーマ |

#### 主要なカスタムフック

| フック | 役割 |
|--------|------|
| `useBookmarks` | Chrome Bookmarks APIからブックマークツリーを読み込み、変更を監視 |
| `useSettings` | chrome.storage.localから設定を読み書き（テーマ、言語、AI設定等） |
| `useTheme` | テーマの切り替え（light / dark / system）とCSS変数の適用 |
| `useI18n` | ロケールに応じた翻訳テキストの提供 |
| `useAutoSync` | ローカルフォルダへの定期同期とブックマーク変更時の同期 |

#### テーマシステム

CSSカスタムプロパティ（デザイントークン）を使ったテーマ切り替えを採用しています。`global.css` にライトテーマとダークテーマの変数を定義し、`data-theme` 属性の切り替えでテーマを即座に反映します。Reactコンポーネントは個別のスタイルを持たず、共通のデザイントークンを参照します。

### セキュリティ方針

SyncGridは「ゼロトラスト・ゼロテレメトリ」の原則に基づいて設計されています。

1. **外部通信なし** -- テレメトリやアナリティクスのためのネットワークリクエストは一切送信しません
2. **Chrome APIのみ** -- データはChrome Bookmarks APIとchrome.storage.localにのみ保存
3. **ユーザー起点の同期** -- ローカルフォルダ同期はユーザーが明示的に許可したフォルダにのみ書き込み
4. **完全性検証** -- エクスポートファイルにはSHA-256チェックサムが含まれ、インポート時に検証
5. **入力検証** -- 全インポートデータにスキーマ検証、URL許可リスト、サイズ制限を適用
6. **Manifest V3 CSP** -- インラインスクリプト禁止、外部スクリプト禁止
7. **AI通信の限定** -- AI APIへの通信はユーザーが明示的に設定した場合のみ、タイトル生成目的に限定

詳細は [SECURITY.md](./SECURITY.md) を参照してください。

### 技術スタック

- React 19 + TypeScript (Strict)
- Vite 7
- Vitest（ユニットテスト）
- Chrome Extensions Manifest V3
- Chrome Bookmarks API / Storage API / Favicon API
- File System Access API
- ランタイム外部依存: React のみ

### プロジェクト構成

```
syncgrid/
├── src/
│   ├── components/     # Reactコンポーネント（UI層）
│   ├── hooks/          # カスタムフック（状態管理・API連携層）
│   ├── i18n/           # 国際化（日本語・英語）
│   ├── styles/         # CSSデザイントークン（テーマ定義）
│   ├── types/          # TypeScript型定義（共有インターフェース）
│   ├── utils/          # ユーティリティ関数（ビジネスロジック層）
│   └── test/           # テストセットアップ
├── public/             # マニフェスト・アイコン等の静的ファイル
├── dist/               # ビルド出力（Chrome拡張として読み込む）
└── .github/workflows/  # CI/CDワークフロー
```

---

## English

### What is SyncGrid?

SyncGrid replaces Chrome's new tab page with a Speed Dial bookmark manager. Organize bookmarks into tabbed groups, navigate folders visually, and keep everything synced via local folder backup.

Zero telemetry. Zero analytics. Zero external tracking.

### Features

| Feature | Description |
|---------|-------------|
| **Speed Dial UI** | Visual card grid with folders and bookmarks |
| **Tab Navigation** | Top-level groups as horizontal tabs |
| **Folder Drill-down** | Click folders to navigate, breadcrumb to go back |
| **Search** | Instant search across all bookmarks |
| **Dark / Light / System** | Full theme support |
| **Export / Import** | JSON backup with SHA-256 integrity verification |
| **Local Folder Sync** | Auto-sync to any local folder (Google Drive, OneDrive, iCloud, Dropbox, Box) |
| **AI Title Generation** | Auto-generate bookmark titles from URLs via OpenAI / Gemini (optional) |
| **Bilingual** | Japanese (default) and English UI |
| **Context Menus** | Right-click to edit, rename, delete |
| **Inline Rename** | Double-click tabs to rename groups |

### Installation

1. Clone this repository
2. Install dependencies and build:
   ```bash
   npm install
   npm run build
   ```
3. Open `chrome://extensions/`
4. Enable **Developer mode**
5. Click **Load unpacked** and select the `dist/` folder

### Development

```bash
npm run dev        # Start dev server with hot reload
npm run build      # TypeScript check + Vite build
npm run zip        # Build and create zip package
npm run lint       # ESLint code quality check
npm run test       # Run tests (watch mode)
npm run test:run   # Run tests once
```

### Cloud Sync -- How It Works

SyncGrid does not connect to any cloud API directly. It uses the **File System Access API** to write a backup file to a local folder of your choice. By pointing this to a cloud drive sync folder, you get cloud sync indirectly.

**Setup:**
1. Open the Settings panel
2. Click **Select folder**
3. Choose a folder synced by your cloud drive:
   - Google Drive: `~/Google Drive/SyncGrid/`
   - OneDrive: `~/OneDrive/SyncGrid/`
   - iCloud Drive: `~/Library/Mobile Documents/com~apple~CloudDocs/SyncGrid/`
   - Dropbox: `~/Dropbox/SyncGrid/`
   - Box: `~/Box/SyncGrid/`

**Behavior:**
- Auto-syncs every 5 minutes and on bookmark changes (3s debounce)
- Writes `syncgrid-sync.json` (standard SyncGrid export format)
- Importable on any other machine running SyncGrid
- Manual **Sync Now** button available

### AI Title Generation (Optional)

Auto-generate bookmark titles from URLs using AI. Disabled by default.

**Supported providers:**
- **OpenAI**: GPT-4.1 Nano / GPT-4.1 Mini / GPT-5 Nano / GPT-5 Mini
- **Gemini**: Gemini 2.0 Flash / Gemini 2.5 Flash / Gemini 2.5 Pro

**Setup:**
1. Select an AI provider in the Settings panel
2. Enter your API key
3. Choose the model to use

API keys are stored in `chrome.storage.local` and never leave your device. Requests to AI APIs only occur during title generation.

### Design Concepts

SyncGrid is built on three design principles.

**1. Privacy First**

Bookmarks contain patterns of user interests and behavior. SyncGrid treats this as sensitive data and adopts a "zero telemetry" principle as its core commitment. There is no backend server -- all data stays on the user's device.

**2. Chrome-Native Integration**

Rather than maintaining a proprietary database, SyncGrid uses the Chrome Bookmarks API directly as its source of truth. This ensures full consistency with Chrome's bookmark bar and bookmark manager. Bookmarks created in SyncGrid are visible in Chrome's built-in tools, and vice versa.

**3. Indirect Sync Model**

Instead of integrating directly with cloud service APIs, SyncGrid writes files to a local folder via the File System Access API. Cloud drive clients (Google Drive, OneDrive, etc.) automatically sync these files. This means SyncGrid needs no OAuth, no API keys, and no tokens -- it leverages the cloud infrastructure users already trust.

### Architecture

#### Overview

SyncGrid is a single-page application (SPA) running as a Chrome extension. It overrides the new tab page via `chrome_url_overrides` and renders a React SPA.

```
┌──────────────────────────────────────────────────┐
│  Chrome New Tab                                  │
│  ┌────────────────────────────────────────────┐  │
│  │  SyncGrid SPA (React + TypeScript)         │  │
│  │                                            │  │
│  │  ┌──────────┐ ┌────────┐ ┌─────────────┐  │  │
│  │  │Component │ │Custom  │ │Utility      │  │  │
│  │  │Layer     │ │Hooks   │ │Layer        │  │  │
│  │  └────┬─────┘ └───┬────┘ └──────┬──────┘  │  │
│  │       │           │             │          │  │
│  └───────┼───────────┼─────────────┼──────────┘  │
│          │           │             │             │
│  ┌───────┴───────────┴─────────────┴──────────┐  │
│  │  Chrome APIs / Web APIs                    │  │
│  │  ┌──────────┐ ┌────────┐ ┌──────────────┐ │  │
│  │  │Bookmarks │ │Storage │ │File System   │ │  │
│  │  │API       │ │API     │ │Access API    │ │  │
│  │  └──────────┘ └────────┘ └──────────────┘ │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

#### Data Flow

```
Chrome Bookmarks API (single source of truth)
        │
        ├──→ useBookmarks hook → delivers data to components
        │       - Loads the bookmark tree
        │       - Monitors changes via chrome.bookmarks.onChanged etc.
        │
        ├──→ Export
        │       - Bookmark tree → JSON conversion
        │       - SHA-256 checksum attached
        │       - File download
        │
        ├──→ Import
        │       - File read → multi-stage validation pipeline
        │       - Writes to Chrome Bookmarks API after validation
        │
        └──→ Local Folder Sync
                - useAutoSync hook runs periodically
                - File System Access API → writes to local folder
                - Cloud drive client syncs automatically
```

#### Layer Structure

| Layer | Directory | Responsibility |
|-------|-----------|----------------|
| **Components** | `src/components/` | UI rendering, user interaction handling |
| **Hooks** | `src/hooks/` | State management, Chrome API bridge, side effects |
| **Utilities** | `src/utils/` | Pure business logic (data transform, validation, API calls) |
| **Types** | `src/types/` | Shared interfaces and constants |
| **i18n** | `src/i18n/` | Translation data and locale switching |
| **Styles** | `src/styles/` | CSS custom properties for design tokens and themes |

### Data Safety

| Concern | How SyncGrid Addresses It |
|---------|--------------------------|
| **Data loss** | Export/import with SHA-256 checksum verification |
| **Corruption** | JSON schema validation on import; malformed data rejected |
| **Cloud sync** | Writes only to user-selected folder; no OAuth required |
| **Privacy** | Zero telemetry, zero analytics |
| **XSS** | URL protocol allowlist (http, https, ftp, chrome, file) |
| **Injection** | All strings sanitized; control characters stripped |
| **Size limits** | Max 10MB import, 512-char titles, 2048-char URLs, 10-level nesting |
| **CSP** | `script-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'` |

### Tech Stack

- React 19 + TypeScript (Strict)
- Vite 7
- Vitest (unit testing)
- Chrome Extensions Manifest V3
- Chrome Bookmarks API / Storage API / Favicon API
- File System Access API
- Runtime dependency: React only

---

## Contributing

コントリビューション歓迎です。詳しくは [CONTRIBUTING.md](./CONTRIBUTING.md) をご覧ください。

Contributions welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## License

MIT -- see [LICENSE](./LICENSE)
