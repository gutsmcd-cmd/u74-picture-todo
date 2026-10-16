export interface Task { id: string; text: string; done: boolean; order: number; created: number; doneAt?: number; seed: number }
export interface Img { key: string; blob: Blob; at: number }
export interface Tr { key: string; en: string }
type Store = 'tasks' | 'images' | 'tr'

let dbp: Promise<IDBDatabase> | null = null
function db(): Promise<IDBDatabase> {
  if (!dbp) dbp = new Promise((res, rej) => {
    const r = indexedDB.open('u74-picture-todo', 1)
    r.onupgradeneeded = () => {
      const d = r.result
      d.createObjectStore('tasks', { keyPath: 'id' })
      d.createObjectStore('images', { keyPath: 'key' })
      d.createObjectStore('tr', { keyPath: 'key' })
    }
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
  return dbp
}
async function tx<T>(store: Store, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db()
  return new Promise((res, rej) => {
    const r = fn(d.transaction(store, mode).objectStore(store))
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
}
export const allTasks = () => tx<Task[]>('tasks', 'readonly', s => s.getAll() as IDBRequest<Task[]>)
export const putTask = (t: Task) => tx('tasks', 'readwrite', s => s.put(t))
export const delTask = (id: string) => tx('tasks', 'readwrite', s => s.delete(id))
export const getImg = (key: string) => tx<Img | undefined>('images', 'readonly', s => s.get(key) as IDBRequest<Img | undefined>)
export const putImg = (v: Img) => tx('images', 'readwrite', s => s.put(v))
export const getTr = (key: string) => tx<Tr | undefined>('tr', 'readonly', s => s.get(key) as IDBRequest<Tr | undefined>)
export const putTr = (v: Tr) => tx('tr', 'readwrite', s => s.put(v))
export async function persist() { try { await navigator.storage?.persist?.() } catch { /* ignore */ } }
