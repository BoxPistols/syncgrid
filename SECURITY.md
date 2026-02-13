# Security Policy / セキュリティポリシー

## Reporting Vulnerabilities / 脆弱性の報告

If you discover a security vulnerability, please open a GitHub issue
with the label `security`. For sensitive issues, please contact the
maintainer directly.

脆弱性を発見された場合は、`security` ラベルを付けてGitHub Issueを作成してください。
機密性の高い問題については、メンテナーに直接ご連絡ください。

---

## Security Architecture / セキュリティアーキテクチャ

### Zero Network Policy / ゼロネットワークポリシー

SyncGrid makes **zero network requests**. It does not:
- Send telemetry or analytics data
- Connect to any external API
- Load remote scripts, fonts, or assets
- Use cookies or tracking pixels

SyncGridは**ネットワークリクエストを一切送信しません**。以下を行いません:
- テレメトリやアナリティクスデータの送信
- 外部APIへの接続
- リモートスクリプト、フォント、アセットの読み込み
- CookieやトラッキングPixelの使用

### Content Security Policy (CSP)

```
script-src 'self';
object-src 'none';
base-uri 'none';
form-action 'none';
```

This ensures:
- Only bundled scripts execute (no inline, no eval, no remote)
- No plugin content (Flash, Java, etc.)
- No base tag hijacking
- No form submission to external endpoints

### Data Storage

| Storage | Data | Scope |
|---------|------|-------|
| Chrome Bookmarks API | Bookmark tree | Synced via Chrome Sync |
| chrome.storage.local | Settings, metadata | Local only |
| IndexedDB | File System handle | Local only (for folder sync) |

### Import Validation Pipeline

All imported data passes through a multi-stage validation pipeline:

```
File → Size check (≤10MB)
     → JSON.parse (no eval)
     → Schema validation (version, appName, structure)
     → Recursive type checking (max depth: 10)
     → URL protocol allowlist (http, https, ftp, chrome, file)
     → SHA-256 checksum verification
     → String sanitization (control chars stripped)
     → Size limits (title: 512, URL: 2048)
     → Import to Chrome Bookmarks
```

If **any** step fails, the entire import is rejected.

### Local Folder Sync Security

- Uses the **File System Access API** — requires explicit user permission
- Permission is requested per-session via browser-native dialog
- Directory handle stored in IndexedDB (browser-managed, not exportable)
- Writes **only** `syncgrid-sync.json` to the selected directory
- Never reads other files in the directory
- Never traverses parent directories
- Atomic write pattern (tmp → final) to prevent corruption

### URL Sanitization

Only the following URL protocols are permitted:
- `http:`
- `https:`
- `ftp:`
- `chrome:`
- `chrome-extension:`
- `file:`

All others (including `javascript:`, `data:`, `blob:`, `vbscript:`) are rejected.

### String Sanitization

All imported strings are:
1. Type-checked (`typeof === 'string'`)
2. Control characters stripped (U+0000–U+0008, U+000B, U+000C, U+000E–U+001F, U+007F)
3. Truncated to maximum length
4. No `eval()`, `innerHTML`, or `document.write()` anywhere in codebase

### Permissions (Minimum Privilege)

| Permission | Reason |
|-----------|--------|
| `bookmarks` | Read/write Chrome bookmarks |
| `storage` | Store settings locally |
| `favicon` | Display site favicons |

No `tabs`, `webRequest`, `activeTab`, `<all_urls>`, or host permissions.

---

## Threat Model / 脅威モデル

| Threat | Mitigation |
|--------|-----------|
| Malicious import file | Schema validation + checksum + URL allowlist |
| XSS via bookmark title/URL | No innerHTML; React's built-in escaping |
| Directory traversal via sync | File System Access API is sandboxed by browser |
| Supply chain attack | Zero runtime dependencies beyond React |
| Data exfiltration | Zero network capability; CSP blocks all external requests |
| Bookmark data tampering | SHA-256 integrity check on import |
