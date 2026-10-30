// Keeps the cleaned data inside this browser (IndexedDB) so it is still there after a refresh.
// Nothing is sent to a server. Each person's browser has its own copy.
const DB = 'order-insights'
const ST = 'kv'
const open = () => new Promise((res, rej) => {
  const r = indexedDB.open(DB, 1)
  r.onupgradeneeded = () => r.result.createObjectStore(ST)
  r.onsuccess = () => res(r.result)
  r.onerror = () => rej(r.error)
})
async function get(k) {
  const db = await open()
  return new Promise((res, rej) => { const t = db.transaction(ST).objectStore(ST).get(k); t.onsuccess = () => res(t.result); t.onerror = () => rej(t.error) })
}
async function put(k, v) {
  const db = await open()
  return new Promise((res, rej) => { const t = db.transaction(ST, 'readwrite'); t.objectStore(ST).put(v, k); t.oncomplete = () => res(); t.onerror = () => rej(t.error) })
}
export async function loadStore() {
  try { return { lines: (await get('lines')) || [], batches: (await get('batches')) || [], ok: true } } catch (e) { return { lines: [], batches: [], ok: false } }
}
export async function saveStore(lines, batches) {
  try { await put('lines', lines); await put('batches', batches); return true } catch (e) { return false }
}
