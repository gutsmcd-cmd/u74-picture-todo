import { getTr, putTr } from './db'

/** Split pasted text into tasks: one per line, bullets / numbers / checkboxes removed. */
export function cleanLines(raw: string): string[] {
  return raw.split(/\r?\n/)
    .map(l => l
      .replace(/^\s*(?:[-*•・●○◦▪▫■□☐☑✅✓✔︎→>＞]+|\[[ xX✓]?\]|【\s*】)\s*/u, '')
      .replace(/^\s*(?:\(?\d{1,3}[.)、．）:]|[0-9０-９]{1,3}[.)、．）:]|[①-⑳]|[a-zA-Z][.)])\s*/u, '')
      .replace(/^\s*(?:[-*•・]+|\[[ xX]?\]|□|☐)\s*/u, '')
      .trim())
    .filter(l => l.length > 0)
    .slice(0, 60)
}

export const hasJa = (s: string) => /[\u3040-\u30ff\u3400-\u9fff\uff66-\uff9f]/.test(s)

// [pattern, emoji, concrete scene for the image prompt (also the fallback if translation is unavailable)]
const KW: [RegExp, string, string][] = [
  [/牛乳|ミルク|milk/i, '🥛', 'a carton of milk'], [/卵|たまご|egg/i, '🥚', 'a basket of eggs'], [/パン|bread/i, '🍞', 'a loaf of fresh bread'],
  [/買い?物|買う|スーパー|shop|buy|grocer/i, '🛒', 'a shopping basket full of groceries'], [/洗濯|ランドリー|laundry|wash clothes/i, '🧺', 'a neat stack of folded clothes'],
  [/掃除|片づけ|片付け|そうじ|clean|tidy|vacuum/i, '🧹', 'a broom, a duster and a sparkling clean room'], [/皿|食器|dish/i, '🍽️', 'clean plates and soap bubbles in a sink'],
  [/料理|ご飯|夕食|晩ご飯|昼食|朝食|cook|dinner|lunch|breakfast|meal/i, '🍳', 'a frying pan and vegetables on a kitchen counter'],
  [/歯医者|dentist/i, '🦷', 'a dentist chair, a toothbrush and a shiny white tooth'], [/電話|call|phone/i, '📞', 'a telephone with a curly cord'], [/病院|医者|薬|doctor|hospital|medicine|pill/i, '💊', 'a medicine bottle and a glass of water'],
  [/水をやる|水やり|植物|花|water the|plant|garden/i, '🪴', 'a watering can watering a potted plant'], [/犬|散歩|dog|walk/i, '🐕', 'a happy dog with a leash'],
  [/猫|cat/i, '🐈', 'a cute cat'], [/メール|返信|email|mail|reply|inbox/i, '📧', 'a laptop with envelope icons'], [/手紙|はがき|letter|post/i, '✉️', 'an envelope with a stamp and a mailbox'],
  [/ゴミ|ごみ|trash|garbage|rubbish|recycl/i, '🗑️', 'a tied trash bag next to a trash can'], [/銀行|払う|支払|請求|bank|pay|bill/i, '💴', 'coins, banknotes and a receipt'],
  [/勉強|宿題|読書|本|study|homework|read|book/i, '📚', 'a stack of books and a pencil'], [/運動|ジム|ストレッチ|ヨガ|走|exercise|gym|run|yoga|stretch/i, '🏃', 'running shoes and a water bottle'],
  [/寝|睡眠|sleep|nap|bed/i, '😴', 'a cozy bed with a pillow and a moon'], [/風呂|シャワー|bath|shower/i, '🛁', 'a bathtub with bubbles and a rubber duck'], [/歯を?磨|brush teeth/i, '🪥', 'a toothbrush and toothpaste'],
  [/会議|ミーティング|打ち合わせ|meeting/i, '👥', 'a table with notebooks and coffee cups for a meeting'], [/仕事|資料|書類|報告|work|report|document/i, '💼', 'a desk with documents and a pen'],
  [/パソコン|コード|プログラム|computer|code|laptop|app/i, '💻', 'a laptop computer on a desk'], [/写真|photo|camera/i, '📷', 'a camera and printed photos'],
  [/車|ガソリン|car|gas|drive/i, '🚗', 'a small car'], [/電車|駅|train|station/i, '🚃', 'a Japanese train at a station'], [/旅行|予約|trip|travel|book a/i, '🧳', 'a suitcase and a plane ticket'],
  [/誕生日|プレゼント|ギフト|birthday|gift|present/i, '🎁', 'a wrapped gift box with a ribbon'], [/ケーキ|お菓子|cake|sweet/i, '🍰', 'a slice of strawberry cake'],
  [/コーヒー|お茶|抹茶|coffee|tea|matcha/i, '🍵', 'a cup of matcha tea and a teapot'], [/音楽|歌|ギター|ピアノ|music|song|guitar|piano/i, '🎵', 'a guitar and music notes'],
  [/髪|美容院|haircut|hair/i, '💇', 'scissors and a comb'], [/服|アイロン|clothes|iron/i, '👕', 'a shirt on a hanger and an iron'], [/布団|ベッド|sheets/i, '🛏️', 'a neatly made bed'],
  [/子ども|子供|学校|保育園|kid|child|school/i, '🎒', 'a school backpack and pencils'], [/母|父|家族|mom|dad|family/i, '👪', 'a cozy house with a heart'],
  [/野菜|果物|りんご|vegetable|fruit|apple/i, '🥕', 'fresh vegetables in a basket'], [/水を?飲|drink water/i, '💧', 'a glass of water'],
]
export function emojiFor(text: string): string {
  for (const [re, e] of KW) if (re.test(text)) return e
  const pool = ['🌸', '🍀', '⭐', '🌷', '🍃', '✨']
  let h = 0; for (const c of text) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return pool[h % pool.length]
}
function sceneFor(text: string): string {
  const hit = KW.find(([re]) => re.test(text)); return hit ? hit[2] : ''
}

/** Japanese task → short English for the image prompt. Cached forever in IndexedDB. */
export async function toEnglish(text: string): Promise<string> {
  if (!hasJa(text)) return text
  const key = 'ja:' + text
  const hit = await getTr(key).catch(() => undefined)
  if (hit) return hit.en
  try {
    const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 8000)
    const r = await fetch(`https://api.mymemory.translated.net/get?langpair=ja|en&q=${encodeURIComponent(text.slice(0, 200))}`, { signal: ctl.signal })
    clearTimeout(tm)
    const j = await r.json() as { responseStatus?: number; responseData?: { translatedText?: string } }
    const en = (j.responseData?.translatedText || '').trim()
    if (r.ok && j.responseStatus === 200 && en && !hasJa(en) && !/MYMEMORY WARNING|QUERY LENGTH/i.test(en)) {
      await putTr({ key, en }).catch(() => {})
      return en
    }
  } catch { /* fall through */ }
  return sceneFor(text) || text
}

export const STYLE = 'v2'
const STYLE_TEXT = "children's picture book illustration, soft colors with a touch of pink and green, plain white background, no text"
/** Concrete objects draw far better than abstract tasks with the free model, so known tasks get a still-life scene. */
export function buildPrompt(original: string, en: string): string {
  const scene = sceneFor(en) || sceneFor(original)
  const subject = scene ? `still life of ${scene}` : en.replace(/[\n\r]+/g, ' ').slice(0, 160)
  return `${subject}, ${STYLE_TEXT}`
}
