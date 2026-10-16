import { getImg, putImg } from './db'
import { buildPrompt, toEnglish, STYLE } from './prompt'

export type ImgState = 'queued' | 'loading' | 'ok' | 'offline' | 'failed'
export const imgKey = (text: string, seed: number) => `${STYLE}|${seed}|${text.trim()}`

type Job = { key: string; text: string; seed: number; cb: (s: ImgState, url?: string) => void }
const queue: Job[] = []
const urls = new Map<string, string>()
let busy = false
let lastAt = 0
const GAP_MS = 1500 // polite gap; on HTTP 402/429 we back off much longer (free tier: one at a time per IP)
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

/** Returns a cached object URL immediately if we have the blob; otherwise queues a download. */
export async function requestImage(text: string, seed: number, cb: Job['cb']): Promise<void> {
  const key = imgKey(text, seed)
  const mem = urls.get(key)
  if (mem) return cb('ok', mem)
  const hit = await getImg(key).catch(() => undefined)
  if (hit) { const u = URL.createObjectURL(hit.blob); urls.set(key, u); return cb('ok', u) }
  if (!navigator.onLine) return cb('offline')
  const dup = queue.find(j => j.key === key)
  if (dup) { const prev = dup.cb; dup.cb = (s, u) => { prev(s, u); cb(s, u) }; cb('queued'); return }
  queue.push({ key, text, seed, cb }); cb('queued')
  void pump()
}
export const cancelImage = (text: string, seed: number) => {
  const i = queue.findIndex(j => j.key === imgKey(text, seed)); if (i >= 0) queue.splice(i, 1)
}

async function pump() {
  if (busy) return
  busy = true
  try {
    while (queue.length) {
      const job = queue.shift()!
      if (!navigator.onLine) { job.cb('offline'); continue }
      job.cb('loading')
      const wait = lastAt + GAP_MS - Date.now(); if (wait > 0) await sleep(wait)
      try {
        const en = await toEnglish(job.text)
        const blob = await fetchImage(buildPrompt(job.text, en), job.seed)
        await putImg({ key: job.key, blob, at: Date.now() }).catch(() => {})
        const u = URL.createObjectURL(blob); urls.set(job.key, u); job.cb('ok', u)
      } catch { job.cb(navigator.onLine ? 'failed' : 'offline') }
      lastAt = Date.now()
    }
  } finally { busy = false }
}

async function fetchImage(prompt: string, seed: number): Promise<Blob> {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&seed=${seed}&nologo=true&safe=true`
  for (let attempt = 0; attempt < 4; attempt++) {
    const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 90000)
    try {
      const r = await fetch(url, { signal: ctl.signal })
      if (r.ok) {
        const b = await r.blob()
        if (b.type.startsWith('image/') && b.size > 2000) return b
        throw new Error('not an image')
      }
      if (r.status === 402 || r.status === 429 || r.status >= 500) {
        const ra = Number(r.headers.get('retry-after')) || 0
        await sleep(Math.min(60, Math.max(ra, r.status >= 500 ? 5 : 20)) * 1000)
        continue
      }
      throw new Error('HTTP ' + r.status)
    } finally { clearTimeout(tm) }
  }
  throw new Error('gave up')
}
