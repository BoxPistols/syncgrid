export const ja = {
  // App
  loading: '読み込み中…',
  // TopBar
  searchPlaceholder: 'ブックマークを検索…',
  toggleTheme: 'テーマ切替',
  settings: '設定',
  // TabBar
  newGroup: '新しいグループ',
  groupNamePlaceholder: 'グループ名…',
  // Toolbar
  back: '戻る',
  addBookmark: '＋ 追加',
  newFolder: '📁 新規フォルダ',
  cancel: 'キャンセル',
  // Search
  searchResults: (q: string, n: number) => `「${q}」の検索結果（${n}件）`,
  noSearchResults: '一致するブックマークが見つかりませんでした',
  // Empty
  noGroups: 'まだグループがありません。\n「＋」ボタンからグループを作成してブックマークを追加しましょう。',
  emptyFolder: 'このフォルダは空です。\n「＋ 追加」でブックマークを追加できます。',
  // Context menu
  openNewTab: '新しいタブで開く',
  edit: '編集',
  delete: '削除',
  open: '開く',
  rename: '名前を変更',
  confirmDeleteFolder: (name: string) => `「${name}」とその中身を削除しますか？`,
  confirmDeleteTab: (name: string) => `「${name}」タブとその中身をすべて削除しますか？`,
  // Bookmark form
  urlPlaceholder: 'URL（例: github.com）',
  titlePlaceholder: 'タイトル（空欄ならURLを使用）',
  add: '追加',
  // Edit modal
  editBookmark: 'ブックマークを編集',
  title: 'タイトル',
  url: 'URL',
  save: '保存',
  // Folder card
  items: (n: number) => `${n}件`,
  // Settings
  settingsTitle: '設定',
  language: '言語',
  theme: 'テーマ',
  themeLight: 'ライト',
  themeDark: 'ダーク',
  themeSystem: 'システム',
  // Data
  dataManagement: 'データ管理',
  exportData: 'データをエクスポート',
  exportDesc: 'ブックマークデータをJSONファイルとしてバックアップ',
  importData: 'データをインポート',
  importDesc: 'JSONファイルからブックマークを復元',
  importSuccess: 'インポートが完了しました。ページを再読み込みします。',
  importError: 'インポートに失敗しました。ファイル形式を確認してください。',
  importConfirm: 'インポートすると現在のデータが上書きされます。続行しますか？',
  // Sync
  localSync: 'ローカルフォルダ同期',
  syncDesc: 'クラウドドライブ（Google Drive, OneDrive, iCloud, Dropbox等）と同期されたローカルフォルダを指定すると、ブックマークデータが自動的にバックアップされます。',
  selectFolder: 'フォルダを選択',
  syncActive: '同期中',
  syncFolder: '同期先フォルダ',
  disconnectSync: '同期を解除',
  lastSynced: (d: string) => `最終同期: ${d}`,
  syncNow: '今すぐ同期',
  // AI
  aiSettings: 'AI設定',
  aiProvider: 'AIプロバイダ',
  aiProviderNone: 'なし',
  aiProviderOpenai: 'OpenAI',
  aiProviderGemini: 'Gemini',
  aiApiKey: 'APIキー',
  aiApiKeyPlaceholder: 'sk-...',
  aiModel: 'モデル',
  aiDesc: 'AIを使ってブックマークのタイトル自動生成などが利用できます。APIキーはローカルにのみ保存されます。',
  aiGenerateTitle: 'AI',
  aiGenerating: '生成中…',
  aiError: 'AI生成に失敗しました',
  aiNotConfigured: 'AI設定が未構成です。設定画面からAPIキーを設定してください。',
  // Security
  security: 'セキュリティ',
  securityDesc: '• データはChrome Bookmarks APIにのみ保存されます\n• 外部サーバーへの送信は一切ありません\n• ローカル同期はユーザーが明示的に選択したフォルダのみに書き込みます\n• エクスポートファイルは暗号化されていません — 安全な場所に保管してください\n• AI APIキーはローカルにのみ保存され、選択したプロバイダにのみ送信されます',
  close: '閉じる',
} as const
