import { buildDataset } from '../lib/build.js'
import { runMining } from '../lib/mining.js'

let ds = null
self.onmessage = (e) => {
  const { id, type, payload } = e.data
  try {
    if (type === 'build') { ds = buildDataset(payload.lines); self.postMessage({ id, ok: true, result: ds }) }
    else if (type === 'mine') { if (!ds) throw new Error('No data loaded'); self.postMessage({ id, ok: true, result: runMining(ds, payload) }) }
  } catch (err) {
    self.postMessage({ id, ok: false, error: String((err && err.message) || err) })
  }
}
