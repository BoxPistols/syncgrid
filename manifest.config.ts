import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

/**
 * manifest.jsonの唯一の定義元。version は package.json から取る
 * （dist/manifest.jsonとpackage.jsonのバージョン不一致を構造的に防ぐ）。
 * key はクロスPC同期の前提となる拡張機能ID固定用（変更しない）。
 */
export default defineManifest({
  manifest_version: 3,
  name: '__MSG_appName__',
  version: pkg.version,
  description: '__MSG_appDescription__',
  default_locale: 'en',
  key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4RmWuYGSSOommGC5EYbjsNziPV/9KwApW5RFrGgPYUZOsJDpDGgdaNfSJfgvm69xu+ttC9R8lyAwEvB/dGRkvVzb3hi5BBjRs3bCnzhzXKtLz1MnhT+2akOU7o73C5+IuX/6z1UDKy4K2R40ce+egcuq0IcrB8iNuto2kX4bMeqCP1EvnL7ijscsiceennIrAHqfwdh9ODaLiDShc756lKBh+hoyRttXf/IfHWC90Cwn9CrI9jQ5K9t6pWi4it32vx4KdPGOVNWoF432866EOxaxVDnnLeEBJM0uX4s2tMlhlgi7wJZOjUqRV7M7Z5H26sPnagzti1BYJPS/u4539QIDAQAB',
  chrome_url_overrides: {
    newtab: 'index.html',
  },
  permissions: ['bookmarks', 'storage', 'favicon'],
  optional_host_permissions: ['https://*/*', 'http://*/*'],
  background: {
    service_worker: 'src/background.ts',
    type: 'module',
  },
  icons: {
    16: 'icons/icon16.png',
    48: 'icons/icon48.png',
    128: 'icons/icon128.png',
  },
  content_security_policy: {
    extension_pages: "script-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'",
  },
})
