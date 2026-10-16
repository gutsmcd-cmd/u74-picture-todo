import './style.css'
import { allTasks, putTask, delTask, persist, type Task } from './db'
import { T, SAMPLE, type Lang } from './i18n'
import { cleanLines, emojiFor } from './prompt'
import { requestImage, cancelImage, type ImgState } from './images'
import { bigTextButton } from './bigtext'

const params = new URLSearchParams(location.search)
let lang: Lang = (localStorage.getItem('u74pt-lang') as Lang) || 'ja'
if (params.get('lang') === 'en' || params.get('lang') === 'ja') lang = params.get('lang') as Lang
let tasks: Task[] = []
const imgs = new Map<string, { s: ImgState; url?: string }>()
let editing: string | null = null
const t = () => T[lang]
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36)
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
const app = document.getElementById('app')!

function shell() {
  document.documentElement.lang = lang
  app.innerHTML = `
  <header>
    <div class="brand"><div class="logo" aria-hidden="true">🖼️</div><div><h1>${t().title}</h1><p>${t().sub}</p></div></div>
    <div class="ctrls"><span id="bt"></span>
      <div class="lang" role="group" aria-label="Language"><button data-l="ja" aria-pressed="${lang === 'ja'}">日本語</button><button data-l="en" aria-pressed="${lang === 'en'}">English</button></div>
    </div>
  </header>
  <main>
    <section class="card input">
      <h2><label for="ta">${t().paste}</label></h2>
      <textarea id="ta" rows="6" placeholder="${esc(t().placeholder)}"></textarea>
      <div class="btns"><button class="go" id="make">✨ ${t().make}</button><button class="ghost" id="sample">${t().sample}</button></div>
      <p class="note">${t().note}</p>
    </section>
    <section class="board">
      <div class="card prog" aria-live="polite"><div class="bar"><i id="barfill"></i></div><p id="progtx"></p></div>
      <h2 class="sec">🌱 ${t().todo} <span id="ntodo"></span></h2>
      <ul class="grid" id="todo"></ul>
      <div class="donehead"><h2 class="sec">🌸 ${t().done} <span id="ndone"></span></h2><button class="ghost small" id="clear">${t().clearDone}</button></div>
      <ul class="grid" id="done"></ul>
    </section>
  </main>
  <footer>${t().foot}</footer>
  <div id="toast" role="status"></div>`
  document.getElementById('bt')!.replaceWith(bigTextButton(t().bigText))
  app.querySelectorAll<HTMLButtonElement>('.lang button').forEach(b => b.onclick = () => {
    lang = b.dataset.l as Lang; localStorage.setItem('u74pt-lang', lang); const v = ta().value; shell(); ta().value = v
  })
  document.getElementById('make')!.onclick = addFromText
  document.getElementById('sample')!.onclick = () => { ta().value = SAMPLE[lang]; ta().focus() }
  document.getElementById('clear')!.onclick = clearDone
  ta().addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); addFromText() } })
  render()
}
const ta = () => document.getElementById('ta') as HTMLTextAreaElement

const todoList = () => tasks.filter(x => !x.done).sort((a, b) => a.order - b.order)
const doneList = () => tasks.filter(x => x.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0))

function mediaHTML(task: Task): string {
  const st = imgs.get(task.id) || { s: 'queued' as ImgState }
  const emo = emojiFor(task.text)
  if (st.s === 'ok' && st.url) return `<img src="${st.url}" alt="" draggable="false">`
  const label = st.s === 'loading' ? t().drawing : st.s === 'queued' ? t().queued : st.s === 'offline' ? t().offline : t().failed
  const shimmer = st.s === 'loading' || st.s === 'queued'
  return `<div class="ph ${shimmer ? 'shimmer' : 'fallback'}"><span class="emo">${emo}</span><span class="st">${label}</span>${st.s === 'failed' ? `<button class="retry" data-a="retry" aria-label="${t().redo}">↻</button>` : ''}</div>`
}

function cardHTML(task: Task): string {
  const ed = editing === task.id
  return `<li class="pcard${task.done ? ' isdone' : ''}" data-id="${task.id}">
    <div class="media" data-a="tick" role="button" tabindex="0" aria-pressed="${task.done}" aria-label="${esc(task.text)} — ${task.done ? t().untick : t().tick}">
      ${mediaHTML(task)}<span class="ck" aria-hidden="true">✓</span>
    </div>
    ${ed ? `<form class="edit" data-id="${task.id}"><input value="${esc(task.text)}" aria-label="${t().edit}"><div><button class="go small" type="submit">${t().save}</button><button class="ghost small" type="button" data-a="cancel">${t().cancel}</button></div></form>`
    : `<div class="row">
      ${task.done ? '' : `<button class="grip" data-a="grip" aria-label="${t().drag}" title="${t().drag}">⠿</button>`}
      <p class="txt" data-a="tick">${esc(task.text)}</p>
    </div>
    <div class="acts">
      <button data-a="edit" aria-label="${t().edit}" title="${t().edit}">✏️</button>
      <button data-a="redo" aria-label="${t().redo}" title="${t().redo}">🎨</button>
      <button data-a="del" aria-label="${t().del}" title="${t().del}">🗑️</button>
    </div>`}
  </li>`
}

function render() {
  const td = todoList(); const dn = doneList()
  const todoEl = document.getElementById('todo')!; const doneEl = document.getElementById('done')!
  todoEl.innerHTML = td.length ? td.map(cardHTML).join('') : (dn.length ? '' : `<li class="empty">${t().none}</li>`)
  doneEl.innerHTML = dn.map(cardHTML).join('')
  document.getElementById('ntodo')!.textContent = td.length ? `(${td.length})` : ''
  document.getElementById('ndone')!.textContent = dn.length ? `(${dn.length})` : ''
  ;(document.querySelector('.donehead') as HTMLElement).hidden = !dn.length
  const total = tasks.length
  ;(document.getElementById('barfill') as HTMLElement).style.width = total ? `${(dn.length / total) * 100}%` : '0%'
  document.getElementById('progtx')!.textContent = total && dn.length === total ? t().allDone : t().progress(dn.length, total)
  ;(document.querySelector('.prog') as HTMLElement).classList.toggle('complete', !!total && dn.length === total)
  const inp = document.querySelector<HTMLInputElement>('form.edit input'); if (inp) { inp.focus(); inp.select() }
}

function updateMedia(id: string) {
  const task = tasks.find(x => x.id === id); if (!task) return
  const m = document.querySelector(`li[data-id="${id}"] .media`); if (!m) return
  const ck = m.querySelector('.ck')
  m.innerHTML = mediaHTML(task); if (ck) m.append(ck)
}

function loadImage(task: Task) {
  void requestImage(task.text, task.seed, (s, url) => {
    if (!tasks.some(x => x.id === task.id && x.text === task.text)) return
    imgs.set(task.id, { s, url }); updateMedia(task.id)
  })
}

async function addFromText() {
  const lines = cleanLines(ta().value)
  if (!lines.length) { ta().focus(); return }
  let max = Math.max(0, ...tasks.map(x => x.order))
  const fresh: Task[] = lines.map(text => ({ id: uid(), text, done: false, order: ++max, created: Date.now(), seed: 1 + Math.floor(Math.random() * 99999) }))
  tasks.push(...fresh)
  for (const f of fresh) await putTask(f)
  ta().value = ''
  render()
  fresh.forEach(loadImage)
  toast(t().added(fresh.length))
  void persist()
}

/* ---------- tick / untick with a check pop, petals and a FLIP slide ---------- */
function rects(): Map<string, DOMRect> {
  const m = new Map<string, DOMRect>()
  document.querySelectorAll<HTMLElement>('li.pcard').forEach(li => m.set(li.dataset.id!, li.getBoundingClientRect()))
  return m
}
function flip(before: Map<string, DOMRect>) {
  if (reduced) return
  document.querySelectorAll<HTMLElement>('li.pcard').forEach(li => {
    const a = before.get(li.dataset.id!); if (!a) return
    const b = li.getBoundingClientRect(); const dx = a.left - b.left; const dy = a.top - b.top
    if (!dx && !dy) return
    li.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.2,.9,.3,1.15)' })
  })
}
function petals(el: HTMLElement) {
  if (reduced) return
  const r = el.getBoundingClientRect(); const cx = r.left + r.width / 2; const cy = r.top + r.height / 2
  const box = document.createElement('div'); box.className = 'burst'; box.style.left = cx + 'px'; box.style.top = cy + 'px'
  const kinds = ['🌸', '🍃', '🌸', '✨', '🌸', '🍀']
  for (let i = 0; i < 22; i++) {
    const s = document.createElement('span')
    const ang = (Math.PI * 2 * i) / 22 + Math.random() * 0.4; const dist = 70 + Math.random() * 90
    if (i % 3 === 2) { s.className = 'dot'; s.style.background = i % 2 ? '#ff8fb8' : '#9ed39a' } else s.textContent = kinds[i % kinds.length]
    s.style.setProperty('--dx', `${Math.cos(ang) * dist}px`); s.style.setProperty('--dy', `${Math.sin(ang) * dist - 30}px`)
    s.style.setProperty('--r', `${Math.random() * 540 - 270}deg`); s.style.animationDelay = `${Math.random() * 60}ms`
    box.append(s)
  }
  document.body.append(box); setTimeout(() => box.remove(), 1300)
}
const ticking = new Set<string>()
async function toggle(id: string) {
  const task = tasks.find(x => x.id === id); if (!task || ticking.has(id)) return
  const li = document.querySelector<HTMLElement>(`li[data-id="${id}"]`)!
  ticking.add(id)
  if (!task.done) {
    li.classList.add('ticking'); petals(li.querySelector('.media') as HTMLElement)
    navigator.vibrate?.(30)
    if (!reduced) await new Promise(r => setTimeout(r, 700))
    task.done = true; task.doneAt = Date.now()
  } else {
    task.done = false; task.doneAt = undefined; task.order = Math.min(0, ...tasks.map(x => x.order)) - 1
  }
  const before = rects(); await putTask(task); render(); flip(before)
  const fresh = document.querySelector(`li[data-id="${id}"]`); fresh?.classList.add(task.done ? 'landed' : 'back')
  ticking.delete(id)
  if (task.done && tasks.every(x => x.done)) setTimeout(() => petals(document.querySelector('.prog') as HTMLElement), 300)
}

/* ---------- delete / undo / edit / redraw ---------- */
let undoFn: (() => void) | null = null
function toast(msg: string, undo?: () => void) {
  const el = document.getElementById('toast')!
  el.innerHTML = esc(msg) + (undo ? ` <button id="undo">${t().undo}</button>` : '')
  undoFn = undo || null
  el.classList.add('show')
  const b = document.getElementById('undo'); if (b) b.onclick = () => { undoFn?.(); undoFn = null; el.classList.remove('show') }
  clearTimeout((toast as unknown as { tm: number }).tm)
  ;(toast as unknown as { tm: number }).tm = window.setTimeout(() => el.classList.remove('show'), undo ? 6000 : 2400)
}
async function removeTasks(list: Task[]) {
  const before = rects()
  tasks = tasks.filter(x => !list.includes(x))
  for (const x of list) { cancelImage(x.text, x.seed); await delTask(x.id) }
  render(); flip(before)
  toast(t().deleted, async () => { tasks.push(...list); for (const x of list) await putTask(x); render(); list.forEach(x => { if (imgs.get(x.id)?.s !== 'ok') loadImage(x) }) })
}
const clearDone = () => removeTasks(tasks.filter(x => x.done))

app.addEventListener('click', e => {
  const target = e.target as HTMLElement
  const a = target.closest<HTMLElement>('[data-a]'); const li = target.closest<HTMLElement>('li.pcard')
  if (!a || !li) return
  const id = li.dataset.id!; const task = tasks.find(x => x.id === id)!
  switch (a.dataset.a) {
    case 'tick': if (!editing) void toggle(id); break
    case 'retry': e.stopPropagation(); imgs.set(id, { s: 'queued' }); updateMedia(id); loadImage(task); break
    case 'redo': task.seed = 1 + Math.floor(Math.random() * 99999); void putTask(task); imgs.set(id, { s: 'queued' }); updateMedia(id); loadImage(task); break
    case 'del': void removeTasks([task]); break
    case 'edit': editing = id; render(); break
    case 'cancel': editing = null; render(); break
  }
})
app.addEventListener('keydown', e => {
  const m = (e.target as HTMLElement).closest<HTMLElement>('.media')
  if (m && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); void toggle(m.closest<HTMLElement>('li')!.dataset.id!) }
})
app.addEventListener('submit', async e => {
  const f = (e.target as HTMLElement).closest<HTMLFormElement>('form.edit'); if (!f) return
  e.preventDefault()
  const task = tasks.find(x => x.id === f.dataset.id)!; const v = cleanLines(f.querySelector('input')!.value)[0]
  editing = null
  if (v && v !== task.text) { cancelImage(task.text, task.seed); task.text = v; await putTask(task); imgs.set(task.id, { s: 'queued' }); render(); loadImage(task) }
  else render()
})

/* ---------- drag to reorder (pointer events: works with touch and mouse) ---------- */
app.addEventListener('pointerdown', e => {
  const grip = (e.target as HTMLElement).closest<HTMLElement>('.grip'); if (!grip) return
  e.preventDefault()
  const li = grip.closest<HTMLElement>('li')!; const list = li.parentElement!
  li.classList.add('dragging') // window listeners (not pointer capture): moving the node in the DOM would drop capture
  const startY = e.clientY; const startX = e.clientX; const ox = li.offsetLeft; const oy = li.offsetTop
  const place = (ev: PointerEvent) => { li.style.transform = `translate(${ev.clientX - startX - (li.offsetLeft - ox)}px, ${ev.clientY - startY - (li.offsetTop - oy)}px) scale(1.04)` }
  const move = (ev: PointerEvent) => {
    if (ev.pointerId !== e.pointerId) return
    place(ev)
    li.style.visibility = 'hidden'
    const over = document.elementFromPoint(ev.clientX, ev.clientY)?.closest<HTMLElement>('li.pcard')
    li.style.visibility = ''
    if (!over || over === li || over.parentElement !== list) return
    const r = over.getBoundingClientRect()
    const sameRow = Math.abs(r.top - li.getBoundingClientRect().top) < r.height / 2
    const after = sameRow ? ev.clientX > r.left + r.width / 2 : ev.clientY > r.top + r.height / 2
    if ((after ? over.nextElementSibling : over) === li) return
    const before = rects()
    list.insertBefore(li, after ? over.nextSibling : over)
    place(ev)
    list.querySelectorAll<HTMLElement>('li.pcard').forEach(o => { if (o === li) return; const a = before.get(o.dataset.id!); const b = o.getBoundingClientRect(); if (a && (a.left !== b.left || a.top !== b.top)) o.animate([{ transform: `translate(${a.left - b.left}px,${a.top - b.top}px)` }, { transform: 'none' }], { duration: 200 }) })
  }
  const up = async () => {
    window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up)
    li.classList.remove('dragging'); li.style.transform = ''
    const ids = [...list.querySelectorAll<HTMLElement>('li.pcard')].map(x => x.dataset.id!)
    for (const [i, id] of ids.entries()) { const tk = tasks.find(x => x.id === id)!; if (tk.order !== i) { tk.order = i; await putTask(tk) } }
  }
  window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up)
})

window.addEventListener('online', () => tasks.forEach(x => { const s = imgs.get(x.id)?.s; if (s === 'offline' || s === 'failed') loadImage(x) }))

async function boot() {
  tasks = await allTasks().catch(() => [])
  if (params.has('demo') && !tasks.length) {
    let o = 0
    tasks = cleanLines(SAMPLE[lang]).map(text => ({ id: uid(), text, done: false, order: o++, created: Date.now(), seed: 1 + (text.length * 7919) % 99999 }))
    for (const x of tasks) await putTask(x)
  }
  shell()
  tasks.forEach(loadImage)
}
void boot()
