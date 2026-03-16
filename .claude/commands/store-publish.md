---
description: Chrome Web Store公開準備チェック
---

以下を確認してください:

1. **manifest.json**: version番号が更新されているか
2. **package.json**: version番号がmanifest.jsonと一致しているか
3. **docs/privacy-policy.html**: 最新の機能（optional_host_permissions等）が反映されているか
4. **docs/store-listing.md**: 新機能が掲載テキストに含まれているか
5. **_locales/**: en/ja のmessages.jsonが正しいか
6. **icons/**: 16, 48, 128 のアイコンが存在するか
7. `npm run zip` を実行して syncgrid-extension.zip を生成

チェック結果を報告し、不足があれば修正してください。
