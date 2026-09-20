/**
 * ブックマークをフォルダへ割り当てる — 型付き判定 (TypeSafe AI の Jev)
 *
 * なぜ分けたか:
 * suggestCategories() は「フォルダ名を考える」と「各ブックマークを割り当てる」を
 * 1つのプロンプトで同時にやり、JSONで書かせている。パースに失敗すると {} を返すので、
 * 30件送って1件も返らないことがある。
 *
 * Jev は文章を生成しないので、フォルダ名の考案は置き換えられない。置き換えるのは
 * 割り当てだけで、フォルダは既存のものか、先に決めたものを渡す。返るのは選択肢の
 * ラベルと確率なので、パースの失敗が起きない。
 *
 * 実測 (2026-09-20, jev-1.13.0): 30件のブックマークを6つのフォルダへ割り当てた。
 *   30件を1リクエスト: 30/30 正解、304ms、入力6,153トークン、$0.00026
 *   1件ずつ30リクエスト: 29/30 正解、9,456ms、入力13,318トークン
 * 3回繰り返して30件すべて同じ判定で、confidence は全件0.8以上だった。
 * まとめて送るほうが速く、安く、正確だった。詳細は docs/assign-folders.md。
 *
 * セキュリティ: キーは chrome.storage.local に置き、TypeSafe 以外へは送らない。
 * 送るのはブックマークの題とURL、フォルダ名と説明だけ。
 */

const ENDPOINT = 'https://api.typesafe.ai/v1/systemone'
const MODEL = 'jev-latest'

/** これを下回る割り当ては採らない。実測では全件0.8以上だった */
export const ASSIGN_CONFIDENCE_MIN = 0.6

/** どのフォルダにも当てはまらないときの受け皿。選択肢に必ず入れる */
export const UNASSIGNED = 'other'

export interface FolderChoice {
  /** フォルダ名。そのまま画面に出る */
  name: string
  /** 何を入れるフォルダかの説明。判定の材料になる */
  description: string
}

export interface BookmarkInput {
  title: string
  url: string
}

export interface Assignment {
  /** items の添字 */
  index: number
  /** 割り当て先のフォルダ名。決められなければ null */
  folder: string | null
  confidence: number
}

/** 選択肢を組み立てる。受け皿は呼び出し側が忘れても必ず入る */
export const buildCriteria = (folders: FolderChoice[]): Record<string, string> => ({
  ...Object.fromEntries(folders.map((f) => [f.name, f.description])),
  [UNASSIGNED]: 'None of the folders above fits this bookmark',
})

/** 応答を割り当てに変える。受け皿と確信の低いものは null にする */
export const toAssignments = (
  answers: Record<string, { choice?: string; confidence?: number } | undefined>,
  count: number,
  folders: FolderChoice[],
  threshold = ASSIGN_CONFIDENCE_MIN,
): Assignment[] => {
  const known = new Set(folders.map((f) => f.name))
  const out: Assignment[] = []
  for (let index = 0; index < count; index++) {
    const answer = answers[`b${index}`]
    const confidence = answer?.confidence ?? 0
    const choice = answer?.choice
    const folder = choice && choice !== UNASSIGNED && known.has(choice) && confidence >= threshold ? choice : null
    out.push({ index, folder, confidence })
  }
  return out
}

export class AssignFoldersError extends Error {}

/**
 * 全ブックマークを1リクエストで割り当てる。
 * 質問を増やしても応答時間はほとんど変わらないので、件数ぶん質問を並べる。
 */
export async function assignFolders(
  items: BookmarkInput[],
  folders: FolderChoice[],
  options: { apiKey: string; threshold?: number; endpoint?: string; signal?: AbortSignal },
): Promise<Assignment[]> {
  if (!options.apiKey) throw new AssignFoldersError('TypeSafe API key is not set')
  if (items.length === 0) return []
  if (folders.length === 0) throw new AssignFoldersError('No folders to assign to')

  const criteria = buildCriteria(folders)
  const questions = Object.fromEntries(
    items.map((_, i) => [
      `b${i}`,
      {
        type: 'choice',
        instructions: `Which folder bookmark #${i} belongs to`,
        criteria,
      },
    ]),
  )
  const state = {
    bookmarks: items.map((item, index) => ({ index, title: item.title, url: item.url })),
  }

  const res = await fetch(options.endpoint ?? ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ state, model: MODEL, questions }),
    signal: options.signal,
  })
  if (!res.ok) throw new AssignFoldersError(`TypeSafe API returned ${res.status}`)
  const json = (await res.json()) as { answers?: Record<string, { choice?: string; confidence?: number }> }
  if (!json.answers) throw new AssignFoldersError('Response has no answers')
  return toAssignments(json.answers, items.length, folders, options.threshold)
}
