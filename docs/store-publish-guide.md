# Chrome Web Store 公開ガイド

## 1. デベロッパー登録

1. [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) にアクセス
2. Google アカウントでログイン
3. 登録料 $5 USD を支払い（一度のみ）
4. デベロッパー名・メールアドレスを登録

## 2. 必要なアセット

### スクリーンショット（必須）
- **サイズ**: 1280 x 800 px または 640 x 400 px
- **形式**: PNG or JPEG
- **枚数**: 最低 1 枚、推奨 3〜5 枚
- **推奨内容**:
  1. メイン画面（ライトテーマ）— グループタブ + ブックマークカードグリッド
  2. メイン画面（ダークテーマ）
  3. ドラッグ＆ドロップ操作中
  4. 検索機能の使用画面
  5. 設定パネル

### プロモーション画像
| タイプ | サイズ | 必須 |
|--------|--------|------|
| Small tile | 440 x 280 px | 推奨 |
| Marquee | 1400 x 560 px | 任意 |

### アイコン（対応済み）
- 128 x 128 px — `public/icons/icon128.png` ✅

## 3. 審査提出手順

### Step 1: 初回アップロード
1. Developer Dashboard → 「新しいアイテム」
2. `dist/` フォルダの zip をアップロード（`npm run zip` で生成）
3. 各フィールドを入力:

### Step 2: ストア掲載情報
- **名前**: 自動（`__MSG_appName__` から解決）
- **説明**: `docs/store-listing.md` の内容をコピー
- **カテゴリ**: Productivity
- **言語**: English + Japanese

### Step 3: プライバシー
- **プライバシーポリシー URL**: GitHub Pages で `docs/privacy-policy.html` を公開
  ```
  https://boxpistols.github.io/syncgrid/privacy-policy.html
  ```
- **Single purpose**: `docs/store-listing.md` の "Single purpose description" をコピー
- **Host permission justification**: 同ファイルの "Host permission justification" をコピー
- **Data usage disclosures**: 全項目「No」

### Step 4: 画像アップロード
- スクリーンショット（上記仕様）をアップロード
- プロモーション画像（任意）

### Step 5: 審査提出
- 「審査のために送信」をクリック
- 通常 1〜3 営業日で審査完了

## 4. GitHub Pages でプライバシーポリシーを公開

```bash
# リポジトリ Settings → Pages → Source: Deploy from a branch
# Branch: main, Folder: /docs
```

公開後の URL: `https://boxpistols.github.io/syncgrid/privacy-policy.html`

## 5. Chrome Web Store API Secrets の設定

自動公開パイプライン（`release.yml`）を有効にするには:

### OAuth クレデンシャルの取得
1. [Google Cloud Console](https://console.cloud.google.com/) → プロジェクト作成
2. 「APIとサービス」→「認証情報」→「OAuth 2.0 クライアント ID」を作成
   - アプリケーションの種類: 「デスクトップ アプリ」
3. Chrome Web Store API を有効化
4. OAuth同意画面を設定

### Refresh Token の取得
```bash
# 1. Authorization code を取得（ブラウザで開く）
https://accounts.google.com/o/oauth2/auth?response_type=code&scope=https://www.googleapis.com/auth/chromewebstore&client_id=YOUR_CLIENT_ID&redirect_uri=urn:ietf:wg:oauth:2.0:oob

# 2. Refresh token を取得
curl -X POST https://oauth2.googleapis.com/token \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "code=AUTH_CODE_FROM_STEP_1" \
  -d "grant_type=authorization_code" \
  -d "redirect_uri=urn:ietf:wg:oauth:2.0:oob"
```

### GitHub Secrets に登録
リポジトリ Settings → Secrets and variables → Actions:

| Secret | 内容 |
|--------|------|
| `CHROME_EXTENSION_ID` | ストアの拡張機能 ID（初回アップロード後に判明） |
| `CHROME_CLIENT_ID` | OAuth Client ID |
| `CHROME_CLIENT_SECRET` | OAuth Client Secret |
| `CHROME_REFRESH_TOKEN` | 上記手順で取得した Refresh Token |

## 6. リリースフロー

```bash
# 1. バージョンを更新
# package.json の "version" と public/manifest.json の "version" を一致させる

# 2. コミット & タグ
git add -A
git commit -m "release: v1.2.0"
git tag v1.2.0
git push origin main --tags

# 3. GitHub Actions が自動で:
#    - Build & Test
#    - GitHub Release 作成（zip添付）
#    - Chrome Web Store にアップロード & 公開（Secrets設定済みの場合）
```

## 7. 審査でリジェクトされやすいポイント

| 項目 | 対策 | 状態 |
|------|------|------|
| `<all_urls>` 使用 | 使っていない | ✅ |
| Remote code execution | Viteバンドルで全てローカル | ✅ |
| 不要な権限 | bookmarks, storage, favicon のみ | ✅ |
| host_permissions 正当性 | AI API限定 + ユーザー明示設定 | ✅ |
| プライバシーポリシー未設定 | docs/privacy-policy.html | ✅ |
| Single purpose 不明確 | 明確に記載 | ✅ |
| スクリーンショット不足 | **要作成** | ⚠️ |
