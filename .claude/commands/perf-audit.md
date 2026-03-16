---
description: パフォーマンス監査（再レンダリング・メモ化）
---

以下のファイルを分析し、パフォーマンス問題を報告してください:

1. **src/App.tsx**:
   - useState, useCallback, useMemoの数をカウント
   - React.memoが必要なのに適用されていないコンポーネントpropsを特定
   - 毎レンダリングで新しい参照が作られるインライン関数/オブジェクトを特定

2. **src/components/BookmarkCard.tsx, FolderCard.tsx**:
   - React.memoが適用されているか確認
   - propsの安定性（親から毎回新規参照が渡されていないか）

3. **src/hooks/useDragReorder.ts**:
   - useCallbackの依存配列が正しいか
   - 不要な再生成がないか

具体的なコード箇所と改善案を報告してください。
