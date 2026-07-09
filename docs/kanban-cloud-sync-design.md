# Kanban クラウド同期 — 要件定義・詳細設計

Status: Draft(未実装) / 作成: 2026-07-10

## 1. 背景と課題

現行のカンバン同期は `chrome.storage.local`(主)+ `chrome.storage.sync`(ミラー)で、
board 全体の `updatedAt` による last-write-wins を採用している。実機検証で以下が判明:

1. **board 単位 LWW の総取り問題** — 食い違った2台を繋ぐと新しい `updatedAt` 側が
   総取りし、もう片方で追加したカードが黙って消える。
2. **拡張IDの分離** — `chrome.storage.sync` は拡張ID単位。unpacked ロードや
   ストア版/開発版の混在でIDが変わると別ストレージになり同期しない。
3. **quota 制約** — sync は 8KB/item・書き込み回数制限があり、カンバンが育つと破綻する。

結論: **chrome.storage.sync をカンバン同期の主経路にするのは Chrome 拡張では現実的でない。**

## 2. 方針(要件定義)

### 2.1 基本方針

- カンバン機能自体は残す。
- 同期経路を **ユーザー自身のクラウドドライブ(OneDrive / Google Drive / iCloud Drive /
  Dropbox 等)のローカル同期フォルダ** に置いたファイル経由に変更する。
  拡張は File System Access API でそのフォルダを読み書きするだけで、
  クラウドへの転送は各ドライブクライアントが行う。**拡張から外部通信は一切しない**
  (ゼロテレメトリ原則を維持。OAuth 等のクラウドAPI直接接続は採用しない)。
- クラウドを使わないユーザーは従来どおり `chrome.storage.local` のみで完結
  (機能劣化なし。同期だけがない状態)。
- `chrome.storage.sync` のカンバンミラーは **廃止**(読み取りマイグレーションのみ残す)。

### 2.2 機能要件

| # | 要件 |
|---|------|
| F1 | 設定画面からユーザーが任意のフォルダ(クラウドドライブ配下を想定)を選択できる |
| F2 | カンバンの変更はデバウンス後に自動でフォルダへ書き出される |
| F3 | 新規タブ表示時・フォーカス時・定期(5分)にフォルダから他端末の変更を取り込む |
| F4 | 端末間で食い違っても**カードが黙って消えない**(アイテム単位マージ+削除トゥームストーン) |
| F5 | フォルダ未設定時は local のみで全機能が動作する |
| F6 | 接続テスト・最終同期時刻・接続解除の UI を提供する |
| F7 | Help パネルに同期の仕組み・各クラウドドライブでの設定手順・制約を解説する |
| F8 | 既存データ(board 単位 LWW / sync ミラー / 旧 bookmarkId 形式)から無損失で移行する |

### 2.3 非機能要件(セキュリティ)

| # | 要件 |
|---|------|
| S1 | フォルダアクセスは File System Access API の明示的許可のみ。選択フォルダ外は一切触れない |
| S2 | ハンドルは IndexedDB に保存し、セッション跨ぎは `queryPermission`/`requestPermission` で再確認 |
| S3 | 同期ファイルに `version` / `deviceId` / `checksum`(SHA-256)を含め、破損・改ざんデータは取り込まない(検証失敗は無視+警告表示) |
| S4 | 取り込み時は多段階検証(型検証 → checksum → URL は `urlGuard` 通過のみ採用)。`dataTransfer.ts` と同じ思想 |
| S5 | (オプション提案)パスフレーズによる AES-GCM 暗号化。共有PCや会社ドライブに置くユーザー向け。初期リリースでは任意 |
| S6 | 認証情報(トークン等)は保持しない。クラウドの認証はユーザーのドライブクライアント側の責務 |

## 3. データ設計(再設計)

### 3.1 KanbanItem — アイテム単位のメタデータを持たせる

```ts
/** カンバン列 */
export type KanbanColumn = 'todo' | 'doing' | 'done'

export interface KanbanItem {
  /** 端末間の安定識別子(従来どおり URL) */
  url: string
  column: KanbanColumn
  /** 列内順序。整数詰め直しをやめ、疎な order(1000刻み)で挿入コストとマージ衝突を軽減 */
  order: number
  dueDate?: number
  /** このアイテムが最後に変更された時刻(アイテム単位 LWW 用) */
  updatedAt: number
  /** 削除トゥームストーン。削除時刻。存在すれば UI 非表示、マージで「削除 vs 更新」を裁定 */
  deletedAt?: number
}

export interface KanbanState {
  /** スキーマバージョン。v2 = アイテム単位マージ */
  schema: 2
  items: KanbanItem[]
  /** board 全体の最終更新(表示用。マージ判定には使わない) */
  updatedAt: number
}
```

### 3.2 マージアルゴリズム(board LWW → アイテム単位 LWW + トゥームストーン)

```
merge(local, remote):
  url をキーに突き合わせ
  - 片方にしか無い → 採用(ただし相手側に deletedAt があり、それが自分の updatedAt より新しければ削除)
  - 両方に有る → updatedAt が新しい方を採用(column / order / dueDate / deletedAt 丸ごと)
  - deletedAt から 30 日経過したトゥームストーンは物理削除(ファイル肥大防止)
```

- 「A で追加・B で別カード移動」→ 両方生きる(現行の総取り問題を解消)。
- 「A で削除・B で移動」→ タイムスタンプの新しい操作が勝つ(削除が黙殺されない)。
- 同一カードの同時編集のみ後勝ち。カンバンの粒度では許容範囲。

### 3.3 同期ファイル — 端末ごとの書き込みファイル分離

クラウドドライブは同一ファイルへの並行書き込みで「競合コピー」ファイルを生成する
(iCloud / OneDrive で顕著)。これを構造的に回避するため **各端末は自分のファイルだけに書く**:

```
<選択フォルダ>/syncgrid/
  kanban-<deviceId>.json   ← 各端末が自分のものだけを書く(read は全部)
```

```ts
/** kanban-<deviceId>.json の中身 */
interface KanbanSyncFile {
  version: 1
  appName: 'SyncGrid'
  deviceId: string          // crypto.randomUUID() を storage.local に永続化
  deviceLabel: string       // 表示用 (例: "Mac mini / Chrome")
  exportedAt: string        // ISO
  checksum: string          // items の SHA-256
  state: KanbanState        // schema:2
}
```

- **読み込み**: `syncgrid/` 配下の `kanban-*.json` を全部読み、検証を通ったものを
  自分の state と順にマージ → local へ保存 → 自分のファイルを書き戻す。
- **書き込み**: 自ファイルのみ。tmp 書き→`move()` のアトミック書きは現行 `localSync.ts` を踏襲。
- 既存のバックアップ `syncgrid-sync.json`(ブックマーク全体)はそのまま併存。
  カンバンは新ファイルへ分離し、`syncgrid-sync.json` の `kanban` フィールドは廃止方向
  (読み取り互換は当面維持)。

### 3.4 マイグレーション

1. 起動時に local の `syncgrid_kanban` を読み、`schema` 無し(v1)なら
   全アイテムに `updatedAt = board.updatedAt ?? 0` を付与して v2 化。
2. `chrome.storage.sync` に旧データがあれば **一度だけ** v2 化してマージ後、
   sync 側キーを削除(以後 sync には書かない)。
3. 旧 `bookmarkId` 形式の破棄マイグレーションは現行ロジックを維持。

## 4. モジュール設計

```
src/utils/kanbanSync.ts      新規: KanbanSyncFile の read/write/validate/merge
src/utils/kanbanMerge.ts     新規: 純粋関数 mergeKanban(local, remote[]) — 単体テスト対象
src/utils/kanban.ts          変更: sync ミラー削除、v2 スキーマ、保存後に kanbanSync へ通知
src/utils/localSync.ts       変更: フォルダハンドル管理を共用(サブフォルダ syncgrid/ 対応)
src/hooks/useKanban.ts       変更: pull → merge → UI 反映のフロー
src/hooks/useAutoSync.ts     変更: カンバン変更もトリガーに追加、visibilitychange で pull
src/components/SettingsPanel.tsx  変更: 同期セクションの文言整理(「Sync」ボタンとの混同解消)
src/components/HelpPanel.tsx      変更: 同期解説セクション追加
src/i18n/ja.ts, en.ts        追加: 上記 UI/Help 文言(キー完全同期)
```

- `mergeKanban` は副作用なしの純粋関数として切り出し、
  「追加vs追加」「削除vs移動」「同時編集」「トゥームストーン期限」をテーブルテストで固定する。
- deviceId は `chrome.storage.local` の `syncgrid_device` に永続化(初回 `crypto.randomUUID()`)。

## 5. 同期フロー

```
[起動/フォーカス/5分毎]
  ハンドル取得(権限なければ静かにスキップ)
  → kanban-*.json 全読込・検証
  → mergeKanban(local, remotes)
  → 変化あれば local 保存 + UI 更新 + 自ファイル書き戻し

[ユーザー操作(カード追加/移動/削除/期限)]
  local 保存(即時・従来どおり)
  → 3秒デバウンスで自ファイル書き出し
```

権限が切れている場合(ブラウザ再起動後など)は自動 pull をスキップし、
TopBar の同期ステータスに「クリックで再接続」を表示(user gesture で `requestPermission`)。

## 6. Help 解説(F7)の構成案

1. 仕組み: 「クラウドドライブの同期フォルダにファイルを置くだけ。SyncGrid は外部送信しない」
2. セットアップ手順: Google Drive(デスクトップ版)/ OneDrive / iCloud Drive / Dropbox の
   各ローカルフォルダパスの例と、設定画面からの選択手順
3. 制約: 反映は各ドライブの同期タイミング依存(リアルタイムではない)/
   ブラウザ再起動後は再許可クリックが必要 / iCloud はオンデマンドダウンロードに注意
4. トラブルシューティング: 接続テスト、競合ファイルが見えた場合(無視してよい設計)、リセット手順

## 7. 追加提案(過不足の指摘)

| 提案 | 推奨度 | 理由 |
|------|--------|------|
| P1: 手動「今すぐ同期」ボタン | ★★★ | ドライブの同期遅延があるため、明示操作の安心感が UX 上重要 |
| P2: 同期ステータス表示(最終 pull/push 時刻・接続端末一覧) | ★★★ | `kanban-*.json` の deviceLabel から他端末の存在を可視化できる |
| P3: パスフレーズ暗号化(AES-GCM) | ★★ | S5。初期は後回し可。ファイル形式に `encrypted: boolean` を最初から予約しておく |
| P4: カンバンの正規化リセット UI | ★★ | メモリに記録済みの「リセットUIが無い」問題の解消。設定に「カンバンを初期化」を追加 |
| P5: 「Sync」ボタンの命名変更 | ★★ | 既存のフォルダバックアップと今回のカンバン同期の混同防止(例: Backup / Cloud Sync) |
| P6: schema に将来の列カスタマイズ(`columns: string[]`)を予約 | ★ | todo/doing/done 固定を将来拡張する余地。今回はやらない |

## 8. リスクと対策

- **File System Access API 非対応環境**(Firefox 移植等): `isSyncSupported()` で機能ごと非表示。local 動作は不変。
- **クラウドドライブの部分同期/遅延**: 端末別ファイル方式により「壊れる」ことはなく「遅れる」だけに留まる。
- **トゥームストーン切れ後の再出現**: 30日以上オフラインだった端末の古いカードが復活しうる。
  取り込み時に「updatedAt がトゥームストーン期限より古い新規アイテムは破棄」で緩和。
- **時計ずれ**: LWW はデバイス時計に依存。カンバン用途では許容とし、ドキュメントに明記。

## 9. 実装フェーズ

1. **Phase 1**: データ設計 v2 + マイグレーション + `mergeKanban` 純粋関数 + テスト(sync ミラー廃止)
2. **Phase 2**: `kanbanSync.ts` + useAutoSync 拡張 + 設定 UI + i18n
3. **Phase 3**: Help 解説 + ステータス表示(P1/P2) + `/e2e-check` + 実機2台検証
4. **Phase 4**(任意): 暗号化(P3)・リセットUI(P4)・命名整理(P5)
