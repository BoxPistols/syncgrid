#!/usr/bin/env node
// フォルダ割り当ての正しさを測る。まとめて1リクエストと、1件ずつ送る方式を比べる。
//
//   TYPESAFE_API_KEY=... node tools/measure-assign-folders.mjs
//
// 題材と正解ラベルは筆者が用意したもので30件。数値の読み方は docs/assign-folders.md。
// 自分のブックマークで測り直すときは、下の DATA を差し替える。

const DATA = {
  "folders": {
    "dev-docs": "Official documentation and API references for programming languages, frameworks and libraries",
    "learning": "Tutorials, courses and long-form articles for learning a topic",
    "tools": "Web services and utilities used while working (converters, generators, dashboards)",
    "news": "News sites, blogs and feeds read for updates",
    "shopping": "Online stores and product pages",
    "other": "None of the above"
  },
  "items": [
    {
      "title": "React Reference Overview",
      "url": "https://react.dev/reference/react",
      "label": "dev-docs"
    },
    {
      "title": "MDN Web Docs: Array.prototype.map()",
      "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map",
      "label": "dev-docs"
    },
    {
      "title": "TypeScript Handbook: Everyday Types",
      "url": "https://www.typescriptlang.org/docs/handbook/2/everyday-types.html",
      "label": "dev-docs"
    },
    {
      "title": "PostgreSQL 17 Documentation",
      "url": "https://www.postgresql.org/docs/17/index.html",
      "label": "dev-docs"
    },
    {
      "title": "Rust std::collections::HashMap",
      "url": "https://doc.rust-lang.org/std/collections/struct.HashMap.html",
      "label": "dev-docs"
    },
    {
      "title": "Chrome Extensions MV3 migration",
      "url": "https://developer.chrome.com/docs/extensions/develop/migrate",
      "label": "dev-docs"
    },
    {
      "title": "Full Stack Open 2026",
      "url": "https://fullstackopen.com/en/",
      "label": "learning"
    },
    {
      "title": "Learn Git Branching",
      "url": "https://learngitbranching.js.org/",
      "label": "learning"
    },
    {
      "title": "Designing Data-Intensive Applications book notes",
      "url": "https://example-notes.dev/ddia-summary",
      "label": "learning"
    },
    {
      "title": "CSS Grid Garden",
      "url": "https://cssgridgarden.com/",
      "label": "learning"
    },
    {
      "title": "統計学入門 講義ノート",
      "url": "https://example-univ.ac.jp/stat/lecture01",
      "label": "learning"
    },
    {
      "title": "Excalidraw",
      "url": "https://excalidraw.com/",
      "label": "tools"
    },
    {
      "title": "JSON Formatter & Validator",
      "url": "https://jsonformatter.org/",
      "label": "tools"
    },
    {
      "title": "Regex101: build, test and debug regex",
      "url": "https://regex101.com/",
      "label": "tools"
    },
    {
      "title": "Vercel Dashboard",
      "url": "https://vercel.com/dashboard",
      "label": "tools"
    },
    {
      "title": "Figma",
      "url": "https://www.figma.com/files",
      "label": "tools"
    },
    {
      "title": "Squoosh image compressor",
      "url": "https://squoosh.app/",
      "label": "tools"
    },
    {
      "title": "Hacker News",
      "url": "https://news.ycombinator.com/",
      "label": "news"
    },
    {
      "title": "The Verge",
      "url": "https://www.theverge.com/",
      "label": "news"
    },
    {
      "title": "日経クロステック 最新記事",
      "url": "https://xtech.nikkei.com/",
      "label": "news"
    },
    {
      "title": "Chrome Developers Blog",
      "url": "https://developer.chrome.com/blog",
      "label": "news"
    },
    {
      "title": "Amazon.co.jp: ノイズキャンセリングヘッドホン",
      "url": "https://www.amazon.co.jp/dp/B0EXAMPLE1",
      "label": "shopping"
    },
    {
      "title": "IKEA デスクチェア MARKUS",
      "url": "https://www.ikea.com/jp/ja/p/markus-example/",
      "label": "shopping"
    },
    {
      "title": "メルカリ 中古キーボード HHKB",
      "url": "https://jp.mercari.com/item/m00000000001",
      "label": "shopping"
    },
    {
      "title": "Apple Store - MacBook Pro",
      "url": "https://www.apple.com/jp/shop/buy-mac/macbook-pro",
      "label": "shopping"
    },
    {
      "title": "歯医者の予約ページ",
      "url": "https://example-dental.jp/reserve",
      "label": "other"
    },
    {
      "title": "区役所 転入届の手続き",
      "url": "https://www.city.example.lg.jp/tenyu",
      "label": "other"
    },
    {
      "title": "レシピ: 鶏むね肉のポン酢炒め",
      "url": "https://cookpad.com/recipe/0000000",
      "label": "other"
    },
    {
      "title": "銀行のインターネットバンキング",
      "url": "https://www.example-bank.co.jp/ib/login",
      "label": "other"
    },
    {
      "title": "航空券の予約確認",
      "url": "https://www.example-air.com/booking/confirm",
      "label": "other"
    }
  ]
}

const apiKey = process.env.TYPESAFE_API_KEY
if (!apiKey) {
  console.error('TYPESAFE_API_KEY が要ります')
  process.exit(2)
}
const { folders, items } = DATA
const ENDPOINT = 'https://api.typesafe.ai/v1/systemone'

const ask = async (state, questions) => {
  const started = Date.now()
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ state, model: 'jev-latest', questions }),
  })
  if (!res.ok) {
    console.error(`APIが ${res.status} を返しました`)
    process.exit(1)
  }
  const json = await res.json()
  return { json, ms: Date.now() - started }
}

// まとめて1リクエスト（件数ぶん質問を並べる）
const many = Object.fromEntries(
  items.map((_, i) => [
    `b${i}`,
    { type: 'choice', instructions: `Which folder bookmark #${i} belongs to`, criteria: folders },
  ]),
)
const batched = await ask(
  { bookmarks: items.map((it, index) => ({ index, title: it.title, url: it.url })) },
  many,
)
const batchedGot = items.map((_, i) => batched.json.answers[`b${i}`])

// 1件ずつ
let oneMs = 0
let oneTokens = 0
const oneGot = []
for (const item of items) {
  const r = await ask(
    { title: item.title, url: item.url },
    { folder: { type: 'choice', instructions: 'Which folder this bookmark belongs to', criteria: folders } },
  )
  oneMs += r.ms
  oneTokens += r.json.usage?.input_tokens ?? 0
  oneGot.push(r.json.answers.folder)
}

const hit = (answers) => answers.filter((a, i) => a.choice === items[i].label).length
const money = (t) => `$${((t / 1e6) * 0.042).toFixed(5)}`
console.log(`ブックマーク${items.length}件 / フォルダ${Object.keys(folders).length}個\n`)
console.log('方式                正解      時間        入力トークン   費用')
console.log(
  `まとめて1回        ${hit(batchedGot)}/${items.length}     ${String(batched.ms).padEnd(10)}${String(batched.json.usage.input_tokens).padEnd(14)}${money(batched.json.usage.input_tokens)}`,
)
console.log(
  `1件ずつ${items.length}回        ${hit(oneGot)}/${items.length}     ${String(oneMs).padEnd(10)}${String(oneTokens).padEnd(14)}${money(oneTokens)}`,
)
const low = batchedGot.filter((a) => a.confidence < 0.8).length
console.log(`\nまとめて1回のconfidence: 最小 ${Math.min(...batchedGot.map((a) => a.confidence))}、0.8未満 ${low}件`)
for (const [i, a] of batchedGot.entries()) {
  if (a.choice !== items[i].label) {
    console.log(`  × 期待${items[i].label} → ${a.choice} (conf ${a.confidence})  ${items[i].title}`)
  }
}
