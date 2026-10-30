import { useMemo, useState } from 'react'
import { fmt } from '../lib/format.js'
import { Card, Col, Scatter } from '../components/charts.jsx'

export default function Basket({ ds, mine, setMine, res, loading, error }) {
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('lift')
  const nB = ds.nOrders - ds.stats.single
  const rows = useMemo(() => {
    if (!res) return []
    const key = { lift: 'lift', conf: 'conf', sup: 'sup' }[sort]
    const t = q.trim().toLowerCase()
    const r = t ? res.rules.filter((x) => ds.items[x.c].toLowerCase().includes(t) || x.a.some((i) => ds.items[i].toLowerCase().includes(t))) : res.rules
    return [...r].sort((x, y) => y[key] - x[key])
  }, [res, q, sort, ds])
  const set = (k, v) => setMine({ ...mine, [k]: v })
  return (
    <div className="flex flex-col gap-4 pt-4">
      <div className="card p-4 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <div><label htmlFor="ms" className="text-sm font-medium">Minimum support <span className="mono">{mine.minSup}%</span></label><input id="ms" type="range" min="0.2" max="8" step="0.1" value={mine.minSup} onChange={(e) => set('minSup', +e.target.value)} /><div className="lab">Items found together in at least this share of orders</div></div>
        <div><label htmlFor="mc" className="text-sm font-medium">Minimum confidence <span className="mono">{mine.minConf}%</span></label><input id="mc" type="range" min="10" max="90" step="5" value={mine.minConf} onChange={(e) => set('minConf', +e.target.value)} /><div className="lab">% of orders with A that also have B</div></div>
        <div><label htmlFor="mx" className="text-sm font-medium">Largest set <span className="mono">{mine.maxLen} items</span></label><input id="mx" type="range" min="2" max="8" step="1" value={mine.maxLen} onChange={(e) => set('maxLen', +e.target.value)} /><div className="lab">Most items allowed in one rule. Bigger sets take longer.</div></div>
        <div><div className="text-sm font-medium mb-1">Orders analysed</div><div className="flex gap-1.5 flex-wrap">
          <button className="btn" aria-pressed={!mine.twoPlus} onClick={() => set('twoPlus', false)}>All orders ({fmt(ds.nOrders)})</button>
          <button className="btn" aria-pressed={mine.twoPlus} onClick={() => set('twoPlus', true)}>2+ items ({fmt(nB)})</button></div></div>
      </div>
      {error && <div className="card p-3 text-sm" role="alert">{error}</div>}
      <div className="lab">{loading ? 'Finding item combinations…' : res ? `${fmt(res.total)} rules from ${fmt(res.nTrans)} orders · ${fmt(res.nFreqItems)} frequent items · FP-Growth · ${(res.ms / 1000).toFixed(1)} s` : ''}</div>
      {res && res.capped && <div className="card p-3 text-sm">The search stopped at 200,000 item sets. Raise the minimum support or lower the largest set to see everything.</div>}
      {res && (
        <div className="grid gap-4 lg:grid-cols-2" style={{ opacity: loading ? 0.5 : 1 }}>
          <Card title="Frequent sets by size" sub="How many item sets pass the minimum support"><Col data={res.sizeCounts.map((v, i) => [(i + 1) + (i ? ' items' : ' item'), v])} label="Frequent sets by size" /></Card>
          <Card title="Rules at these settings" sub="Each dot is a rule. A bigger dot means a stronger link."><Scatter rules={res.rules} /></Card>
        </div>
      )}
      {res && (
        <div className="card p-4 min-w-0" style={{ opacity: loading ? 0.5 : 1 }}>
          <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
            <div className="font-semibold text-[15px]">Items often ordered together</div>
            <div className="flex gap-2 items-center flex-wrap">
              <label htmlFor="rq" className="sr-only">Search rules</label><input id="rq" type="text" placeholder="Search an item" value={q} onChange={(e) => setQ(e.target.value)} />
              <label htmlFor="rs" className="lab">Sort by</label>
              <select id="rs" value={sort} onChange={(e) => setSort(e.target.value)}><option value="lift">Strength</option><option value="conf">Also order it</option><option value="sup">Together</option></select>
            </div>
          </div>
          <div className="overflow-x-auto"><table className="w-full min-w-[680px]"><thead><tr><th>If the order has</th><th>It often also has</th><th>Items</th><th>Together</th><th>Also order it</th><th>Strength</th></tr></thead>
            <tbody>{rows.slice(0, 200).map((r, i) => (
              <tr key={i}><td>{r.a.map((x) => ds.items[x]).join(' + ')}</td><td className="font-medium">{ds.items[r.c]}</td><td className="mono">{r.a.length + 1}</td><td className="mono">{(r.sup * 100).toFixed(1)}%</td><td className="mono">{(r.conf * 100).toFixed(0)}%</td>
                <td><div className="flex items-center gap-2"><div className="h-2" style={{ width: Math.min(120, r.lift * 22), background: 'var(--c2)' }} /><span className="mono text-xs">{r.lift.toFixed(1)}×</span></div></td></tr>))}
              {rows.length === 0 && <tr><td colSpan="6" style={{ color: 'var(--mut)' }}>No rules at these settings. Lower the support or confidence.</td></tr>}</tbody></table></div>
          {rows.length > 200 && <div className="lab mt-2">Showing 200 of {fmt(rows.length)}. Use the search to narrow down.</div>}
          <div className="lab mt-3">Strength is lift: 2.0× means the items appear together twice as often as chance.</div>
        </div>
      )}
    </div>
  )
}
