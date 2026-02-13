# Contributing / コントリビューション

## English

Thanks for your interest in contributing to SyncGrid!

### Getting Started

```bash
git clone https://github.com/YOUR_USERNAME/syncgrid.git
cd syncgrid
npm install
npm run dev
```

To test as a Chrome extension:
1. `npm run build`
2. Open `chrome://extensions/` → Enable Developer mode
3. Click **Load unpacked** → select `dist/`

### Guidelines

- **Security first**: SyncGrid makes zero network requests. Any PR adding external connections will be rejected.
- **Privacy**: No analytics, no telemetry, no tracking. Ever.
- **Minimal dependencies**: We use only React at runtime. Think twice before adding a dependency.
- **i18n**: All user-facing strings must be in both `src/i18n/ja.ts` and `src/i18n/en.ts`.
- **TypeScript**: Strict mode. No `any` unless absolutely necessary.
- **CSS**: Use CSS custom properties (tokens) defined in `global.css`. No inline styles in components.

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit with clear messages
4. Open a PR against `main`

### Reporting Issues

- Use the issue templates when available
- For security vulnerabilities, see [SECURITY.md](./SECURITY.md)

---

## 日本語

SyncGridへのコントリビューションに興味を持っていただきありがとうございます！

### 始め方

```bash
git clone https://github.com/YOUR_USERNAME/syncgrid.git
cd syncgrid
npm install
npm run dev
```

Chrome拡張機能としてテストする場合:
1. `npm run build`
2. `chrome://extensions/` を開く → デベロッパーモードを有効化
3. **パッケージ化されていない拡張機能を読み込む** → `dist/` を選択

### ガイドライン

- **セキュリティ最優先**: SyncGridはネットワークリクエストを一切送信しません。外部通信を追加するPRは却下されます。
- **プライバシー**: アナリティクス、テレメトリ、トラッキングは一切禁止です。
- **最小限の依存関係**: ランタイムではReactのみ使用。依存追加は慎重に。
- **i18n**: ユーザー向け文字列は `src/i18n/ja.ts` と `src/i18n/en.ts` の両方に必要です。
- **TypeScript**: Strictモード。`any` は必要最低限のみ。
- **CSS**: `global.css` で定義されたCSSカスタムプロパティ（トークン）を使用。コンポーネントにインラインスタイルを入れないでください。

### プルリクエスト

1. リポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/my-feature`)
3. 明確なコミットメッセージで変更をコミット
4. `main` に対してPRを作成

### 問題の報告

- 利用可能な場合はIssueテンプレートを使用してください
- セキュリティの脆弱性については [SECURITY.md](./SECURITY.md) を参照してください
