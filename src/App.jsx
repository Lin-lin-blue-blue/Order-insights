import { useCallback, useEffect, useRef, useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import Upload from './pages/Upload.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Basket from './pages/Basket.jsx'
import Bundle from './pages/Bundle.jsx'
import { call } from './lib/engine.js'
import { loadStore, saveStore } from './lib/storage.js'
import { fmt, dayToISO } from './lib/format.js'

const KEYS = ['import', 'dashboard', 'basket', 'bundle']
const STEPS = ['Import & cleaning', 'Dashboard', 'Basket analysis', 'Bundle builder']
const SUB = ['Import orders and let the system clean them.', 'Explore sales with your own filters.', 'See which items are ordered together.', 'Pick items and get bundle ideas.']
let version = 0

export default function App() {
  const store = useRef({ lines: [], batches: [] })
  const [status, setStatus] = useState('loading')
  const [ds, setDs] = useState(null)
  const [batches, setBatches] = useState([])
  const [persisted, setPersisted] = useState(true)
  const [tab, setTab] = useState(() => { const i = KEYS.indexOf(location.hash.slice(1)); return i < 0 ? 0 : i })
  const [mine, setMine] = useState({ minSup: 1, minConf: 30, maxLen: 4, twoPlus: false })
  const [res, setRes] = useState(null)
  const [mining, setMining] = useState(false)
  const [mineErr, setMineErr] = useState('')
  const seq = useRef(0)

  const go = (i) => { setTab(i); try { location.hash = KEYS[i] } catch (e) {} }

  const rebuild = useCallback(async (lines, bs) => {
    store.current = { lines, batches: bs }
    setBatches(bs)
    if (!lines.length) { setDs(null); setRes(null); setStatus('empty'); return null }
    const d = await call('build', { lines })
    d.version = ++version
    setDs(d); setStatus('ready'); setRes(null)
    return d
  }, [])

  useEffect(() => {
    (async () => {
      const s = await loadStore()
      setPersisted(s.ok)
      await rebuild(s.lines, s.batches)
    })()
  }, [rebuild])

  const importFile = async (newLines, meta, mode) => {
    let lines = mode === 'replace' ? [] : store.current.lines
    const bs = mode === 'replace' ? [] : store.current.batches
    if (lines.length) { const ids = new Set(newLines.map((l) => l[0])); lines = lines.filter((l) => !ids.has(l[0])) }
    lines = lines.concat(newLines)
    const d = await rebuild(lines, [...bs, meta])
    setPersisted(await saveStore(lines, [...bs, meta]))
    return d
  }
  const removeBatch = async (id) => {
    const lines = store.current.lines.filter((l) => l[9] !== id), bs = store.current.batches.filter((b) => b.id !== id)
    await rebuild(lines, bs); await saveStore(lines, bs)
  }
  const clearAll = async () => { await rebuild([], []); await saveStore([], []) }

  // Re-run the item-combination search whenever the data or the settings change (after a short pause).
  useEffect(() => {
    if (!ds) return
    const id = ++seq.current
    setMining(true)
    const t = setTimeout(async () => {
      try {
        const r = await call('mine', { minSup: mine.minSup / 100, minConf: mine.minConf / 100, maxLen: mine.maxLen, twoPlus: mine.twoPlus })
        if (id === seq.current) { setRes(r); setMineErr('') }
      } catch (e) { if (id === seq.current) setMineErr(e.message) }
      if (id === seq.current) setMining(false)
    }, 450)
    return () => clearTimeout(t)
  }, [ds, mine])

  const app = { ds, batches, importFile, removeBatch, clearAll, persisted }
  const empty = (
    <div className="card p-8 mt-4 text-center max-w-xl">
      <div className="font-semibold text-[15px]">No data yet</div>
      <div className="text-sm mt-1" style={{ color: 'var(--mut)' }}>Import an order file first. The system cleans it and fills every page.</div>
      <button className="primary mt-4" onClick={() => go(0)}>Go to import</button>
    </div>
  )
  const summary = ds ? <>{fmt(ds.nOrders)} orders · {fmt(ds.items.length)} items<br />{dayToISO(ds.stats.dayMin)} – {dayToISO(ds.stats.dayMax)}</> : 'No data loaded'

  return (
    <div className="app">
      <Sidebar steps={STEPS} tab={tab} onTab={go} summary={summary} />
      <div className="main">
        <header className="pt-6"><h1 className="text-2xl font-semibold">{STEPS[tab]}</h1><div className="text-sm" style={{ color: 'var(--mut)' }}>{SUB[tab]}</div></header>
        <main>
          {status === 'loading' && <div className="lab py-10">Loading saved data…</div>}
          {tab === 0 && status !== 'loading' && <Upload app={app} go={go} />}
          {tab !== 0 && status === 'empty' && empty}
          {status === 'ready' && tab === 1 && <Dashboard key={ds.version} ds={ds} />}
          {status === 'ready' && tab === 2 && <Basket ds={ds} mine={mine} setMine={setMine} res={res} loading={mining} error={mineErr} />}
          {status === 'ready' && tab === 3 && <Bundle ds={ds} res={res} loading={mining} />}
        </main>
      </div>
    </div>
  )
}
