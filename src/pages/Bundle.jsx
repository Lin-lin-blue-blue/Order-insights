import { useMemo, useState } from 'react'

export default function Bundle({ ds, res, loading }) {
  const [sel, setSel] = useState([])
  const [q, setQ] = useState('')
  const [n, setN] = useState(2)
  const byPop = useMemo(() => ds.items.map((_, i) => i).sort((a, b) => ds.itemOrders[b] - ds.itemOrders[a]), [ds])
  const t = q.trim().toLowerCase()
  const shown = (t ? byPop.filter((i) => ds.items[i].toLowerCase().includes(t)) : byPop).filter((i) => !sel.includes(i)).slice(0, 40)
  const tg = (i) => setSel((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]))

  const recs = useMemo(() => {
    if (!res || !sel.length) return []
    const S = new Set(sel), m = new Map()
    for (const r of res.rules) {
      if (S.has(r.c)) continue
      const ov = r.a.filter((x) => S.has(x)).length
      if (!ov) continue
      const full = ov === r.a.length
      const sc = full ? r.lift + 0.05 * r.a.length : r.lift * (ov / r.a.length) * 0.7
      const cur = m.get(r.c)
      if (!cur || cur.sc < sc) m.set(r.c, { c: r.c, sc, lift: r.lift, conf: r.conf, a: r.a, full })
    }
    return [...m.values()].sort((a, b) => b.sc - a.sc)
  }, [res, sel])
  const bundle = [...sel, ...recs.slice(0, n).map((r) => r.c)]
  const chip = (i) => <button key={i} className="btn" aria-pressed={sel.includes(i)} onClick={() => tg(i)}>{ds.items[i]}</button>

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr] pt-4">
      <div className="card p-4 min-w-0">
        <div className="font-semibold text-[15px]">Pick one or more items</div>
        <div className="lab mb-3">Select as many as you like. Most ordered items are listed first.</div>
        <label htmlFor="q" className="sr-only">Search items</label>
        <input id="q" type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${ds.items.length} items`} className="w-full mb-3" />
        {sel.length > 0 && <div className="flex flex-wrap gap-1.5 mb-3 pb-3 border-b" style={{ borderColor: 'var(--line)' }}>{sel.map(chip)}</div>}
        <div className="flex flex-wrap gap-1.5">{shown.map(chip)}</div>
        <div className="flex items-center gap-3 mt-4 text-sm"><span>{sel.length} selected</span>{sel.length > 0 && <button className="underline" style={{ color: 'var(--mut)' }} onClick={() => setSel([])}>Clear</button>}</div>
      </div>
      <div className="flex flex-col gap-4 min-w-0">
        <div className="card p-4" style={{ borderColor: 'var(--acc)', borderWidth: 2 }}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="lab">Suggested bundle</div>
            <div className="flex items-center gap-1.5"><span className="lab mr-1">Add-ons</span>{[1, 2, 3, 4].map((x) => <button key={x} className="btn" aria-pressed={n === x} onClick={() => setN(x)}>{x}</button>)}</div>
          </div>
          {sel.length ? <div className="text-xl font-semibold mt-2">{bundle.map((i) => ds.items[i]).join(' + ')}</div> : <div className="mt-2 text-sm" style={{ color: 'var(--mut)' }}>Select at least one item to see a bundle.</div>}
          {sel.length > 0 && recs.length > 0 && <div className="text-sm mt-2" style={{ color: 'var(--mut)' }}>The strongest link is {recs[0].lift.toFixed(1)}× more likely than chance.</div>}
        </div>
        <div className="card p-4">
          <div className="font-semibold text-[15px] mb-2">Recommended add-ons</div>
          {!res ? <div className="text-sm" style={{ color: 'var(--mut)' }}>{loading ? 'Finding item combinations…' : 'Rules are not ready yet.'}</div>
            : recs.length === 0 ? <div className="text-sm" style={{ color: 'var(--mut)' }}>{sel.length ? 'No strong partner found. Lower the support on the Basket analysis page to find more.' : 'Nothing selected yet.'}</div>
              : <ul>{recs.slice(0, 20).map((r, i) => (
                <li key={r.c} className="py-2 border-b flex flex-wrap gap-x-4 gap-y-1 items-center" style={{ borderColor: 'var(--line)' }}>
                  <div className="flex-1 min-w-[180px]"><div className="font-medium">{i + 1}. {ds.items[r.c]}{i < n && <span className="lab ml-2">in bundle</span>}</div>
                    <div className="lab">{r.full ? 'Rule matches all of' : 'Rule matches part of'} {r.a.map((x) => ds.items[x]).join(' + ')}</div></div>
                  <div className="mono text-xs">{(r.conf * 100).toFixed(0)}% also order it</div>
                  <div className="mono text-xs" style={{ color: 'var(--acc)' }}>{r.lift.toFixed(1)}× strength</div>
                </li>))}</ul>}
        </div>
      </div>
    </div>
  )
}
