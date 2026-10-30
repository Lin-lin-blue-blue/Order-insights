// Small wrapper: runs the heavy work (building tables, mining rules) in a Web Worker so the page stays responsive.
let worker = null
let seq = 0
const pending = new Map()
function get() {
  if (!worker) {
    worker = new Worker(new URL('../workers/engine.worker.js', import.meta.url), { type: 'module' })
    worker.onmessage = (e) => {
      const { id, ok, result, error } = e.data
      const p = pending.get(id)
      if (!p) return
      pending.delete(id)
      ok ? p.res(result) : p.rej(new Error(error))
    }
  }
  return worker
}
export const call = (type, payload) => new Promise((res, rej) => { const id = ++seq; pending.set(id, { res, rej }); get().postMessage({ id, type, payload }) })
