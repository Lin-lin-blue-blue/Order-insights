import { useState } from 'react'
import Papa from 'papaparse'
import { FIELDS, guessMapping, missingRequired, Cleaner } from '../lib/clean.js'
import { fmt } from '../lib/format.js'

async function readHeaders(file) {
  if (/\.xlsx?$/i.test(file.name)) {
    const XLSX = await import('xlsx')
    const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true })
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: '' })
    return { headers: (rows[0] || []).map(String), rows }
  }
  const headers = await new Promise((res, rej) => Papa.parse(file, { preview: 1, skipEmptyLines: true, complete: (r) => res((r.data[0] || []).map(String)), error: rej }))
  return { headers, rows: null }
}

function streamCsv(file, onRow, onProgress) {
  return new Promise((res, rej) => {
    let first = true
    Papa.parse(file, {
      skipEmptyLines: true,
      chunk: (r) => {
        for (const row of r.data) { if (first) { first = false; continue } onRow(row) }
        onProgress(Math.min(1, r.meta.cursor / file.size))
      },
      complete: res,
      error: rej,
    })
  })
}

export default function Upload({ app, go }) {
  const { ds, batches, importFile, removeBatch, clearAll, persisted } = app
  const [file, setFile] = useState(null)
  const [headers, setHeaders] = useState(null)
  const [rows, setRows] = useState(null)
  const [map, setMap] = useState({})
  const [modifierDash, setModifierDash] = useState(true)
  const [mode, setMode] = useState('add')
  const [phase, setPhase] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [log, setLog] = useState(null)
  const [err, setErr] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)

  const pick = async (f, auto) => {
    if (!f) return
    setErr(''); setLog(null)
    try {
      const { headers, rows } = await readHeaders(f)
      if (!headers.length) throw new Error('The file looks empty.')
      const m = guessMapping(headers)
      setFile(f); setHeaders(headers); setRows(rows); setMap(m); setPhase('mapping')
      if (auto && !missingRequired(m).length) run(f, headers, rows, m, true)
    } catch (e) { setErr('Could not read this file. ' + e.message); setPhase('idle') }
  }

  const run = async (f = file, hdr = headers, rws = rows, m = map, md = modifierDash) => {
    setPhase('running'); setProgress(0); setErr('')
    try {
      const batchId = Date.now()
      const cleaner = new Cleaner(m, { modifierDash: md && m.modifier >= 0, batch: batchId })
      if (rws) {
        for (let i = 1; i < rws.length; i++) { cleaner.add(rws[i]); if (i % 20000 === 0) setProgress(i / rws.length) }
      } else {
        await streamCsv(f, (row) => cleaner.add(row), setProgress)
      }
      const { lines, stats } = cleaner.finish()
      if (!lines.length) throw new Error('No usable rows were found. Check the column choices and the Modifier option.')
      const dsNew = await importFile(lines, { id: batchId, file: f.name, importedAt: Date.now(), rawRows: stats.raw, orders: stats.orders }, mode)
      setLog({ stats, ds: dsNew, file: f.name })
      setPhase('done')
    } catch (e) { setErr(e.message); setPhase('mapping') }
  }

  const sample = async () => {
    setErr('')
    try {
      const r = await fetch(import.meta.env.BASE_URL + 'sample_orders.csv')
      const blob = await r.blob()
      await pick(new File([blob], 'sample_orders.csv', { type: 'text/csv' }), true)
    } catch (e) { setErr('Could not load the sample file.') }
  }

  const missing = missingRequired(map)
  const steps = log && [
    ['Rows read from the file', fmt(log.stats.raw), ''],
    ['Rows without an order ID or item name', fmt(log.stats.noId), 'removed'],
    ['Rows with a modifier other than "-"', fmt(log.stats.modRemoved), log.stats.raw ? '−' + ((log.stats.modRemoved / log.stats.raw) * 100).toFixed(1) + '%' : ''],
    ['Rows with an unreadable start date', fmt(log.stats.badDate), 'removed'],
    ['Pax converted to a number, start/end date and time merged', fmt(log.stats.kept) + ' rows kept', ''],
    ['Grouped by order and item, QTY summed', fmt(log.stats.lines) + ' item lines', fmt(log.stats.orders) + ' orders'],
    ['Negative durations (left out of duration charts)', fmt(log.ds.stats.negDur), 'all data'],
    ['Orders longer than 2 hours (left out of duration charts)', fmt(log.ds.stats.over120), 'all data'],
    ['Party size above 30 (left out of party-size chart)', fmt(log.ds.stats.pax30), 'all data'],
  ]

  return (
    <div className="flex flex-col gap-4 pt-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="card p-5 flex flex-col gap-4 min-w-0">
          <div className="font-semibold text-[15px]">Import order data</div>
          <label htmlFor="f" className="border border-dashed p-8 text-center cursor-pointer block" style={{ borderColor: 'var(--acc)' }}
            onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files[0]) }}>
            <div className="font-medium">Drop a CSV or Excel file here</div>
            <div className="lab">or click to browse</div>
            <input id="f" type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={(e) => { pick(e.target.files[0]); e.target.value = '' }} />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button className="btn" onClick={sample}>Try the sample file</button>
            <span className="lab">3,500 made-up orders so you can test every page.</span>
          </div>
          <div>
            <div className="text-sm font-medium mb-1">Columns the system looks for</div>
            <div className="mono text-xs leading-6" style={{ color: 'var(--mut)' }}>Transaction_ID · Item_Name · QTY · Category · Start date and time · End date and time · Service_Type · Outlet_Code · Pax · Modifier</div>
          </div>
          <div className="lab">The file stays in this browser. Nothing is uploaded to a server.</div>
          {err && <div className="text-sm p-3" style={{ border: '1px solid var(--acc)' }} role="alert">{err}</div>}
        </div>

        <div className="card p-5 min-w-0">
          {phase === 'idle' && !log && <div className="lab py-16 text-center">Choose a file to start. You will check the columns, then the system cleans it.</div>}
          {phase === 'mapping' && headers && (
            <div>
              <div className="flex items-baseline justify-between gap-2 flex-wrap"><div className="font-semibold text-[15px]">Check the columns</div><div className="lab truncate">{file.name}</div></div>
              <div className="grid gap-x-4 gap-y-2 mt-3 sm:grid-cols-2">
                {FIELDS.map((f) => (
                  <label key={f.key} className="text-sm flex flex-col gap-1" htmlFor={'m-' + f.key}>
                    <span>{f.label}{f.req && <span style={{ color: 'var(--acc)' }}> *</span>}</span>
                    <select id={'m-' + f.key} value={map[f.key] ?? -1} onChange={(e) => setMap({ ...map, [f.key]: +e.target.value })}>
                      <option value={-1}>(not in my file)</option>
                      {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                    </select>
                  </label>
                ))}
              </div>
              <label className="flex items-start gap-2 text-sm mt-4"><input type="checkbox" className="mt-1" checked={modifierDash} disabled={map.modifier < 0} onChange={(e) => setModifierDash(e.target.checked)} />
                <span>Keep only rows where Modifier is "-" (the main item rows, as in the analysis notebook)</span></label>
              <fieldset className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                <legend className="lab mb-1">When data is already loaded</legend>
                <label className="flex items-center gap-2"><input type="radio" name="mode" checked={mode === 'add'} onChange={() => setMode('add')} />Add to the current data</label>
                <label className="flex items-center gap-2"><input type="radio" name="mode" checked={mode === 'replace'} onChange={() => setMode('replace')} />Replace the current data</label>
              </fieldset>
              <div className="lab mt-1">Adding skips orders that are already loaded, so importing the same file twice does not double count.</div>
              <div className="mt-4 flex items-center gap-3 flex-wrap">
                <button className="primary" disabled={missing.length > 0} onClick={() => run()}>Clean and import</button>
                {missing.length > 0 && <span className="lab">Still needed: {missing.join(', ')}</span>}
              </div>
            </div>
          )}
          {phase === 'running' && (
            <div className="py-10">
              <div className="font-medium mb-3">Cleaning {file && file.name}</div>
              <div className="h-2" style={{ background: 'var(--bg)' }}><div className="h-2" style={{ width: Math.max(4, progress * 100) + '%', background: 'var(--acc)' }} /></div>
              <div className="lab mt-2">Reading rows, then building tables. Large files can take a minute.</div>
            </div>
          )}
          {phase === 'done' && log && (
            <div>
              <div className="flex items-center justify-between mb-2"><div className="font-semibold text-[15px]">Cleaning log</div><div className="lab truncate">{log.file}</div></div>
              <ul>{steps.map((l, i) => (
                <li key={i} className="flex gap-3 py-2 border-b text-sm" style={{ borderColor: 'var(--line)' }}>
                  <span className="w-4" style={{ color: 'var(--acc)' }}>✓</span>
                  <div className="flex-1 min-w-0"><div className="font-medium">{l[0]}</div><div style={{ color: 'var(--mut)' }}>{l[1]}</div></div>
                  <div className="mono text-xs" style={{ color: 'var(--acc)' }}>{l[2]}</div>
                </li>))}</ul>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="mono text-sm">Now loaded: <b>{fmt(log.ds.nOrders)} orders</b> · {fmt(log.ds.items.length)} items</div>
                <button className="primary ml-auto" onClick={() => go(1)}>Open dashboard</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card p-4 min-w-0">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
          <div className="font-semibold text-[15px]">Data loaded in this browser</div>
          {batches.length > 0 && (confirmClear
            ? <div className="flex items-center gap-2 text-sm">Remove all data? <button className="btn" onClick={() => { clearAll(); setConfirmClear(false); setLog(null); setPhase('idle') }}>Yes, remove</button><button className="btn" onClick={() => setConfirmClear(false)}>Cancel</button></div>
            : <button className="btn" onClick={() => setConfirmClear(true)}>Remove all data</button>)}
        </div>
        {batches.length === 0 ? <div className="lab py-4">Nothing loaded yet.</div> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[520px]"><thead><tr><th>File</th><th>Imported</th><th>Rows read</th><th>Orders</th><th /></tr></thead>
            <tbody>{batches.map((b) => (
              <tr key={b.id}><td>{b.file}</td><td className="mono">{new Date(b.importedAt).toLocaleString()}</td><td className="mono">{fmt(b.rawRows)}</td><td className="mono">{fmt(b.orders)}</td>
                <td className="text-right"><button className="btn" onClick={() => removeBatch(b.id)}>Remove</button></td></tr>))}</tbody></table></div>
        )}
        <div className="lab mt-3">{persisted ? 'Saved in this browser, so it is still here after a refresh. Other people and other computers have their own copy.' : 'This browser blocked saving, so the data will be gone after a refresh.'}</div>
        {ds && <div className="lab mt-1">Total: {fmt(ds.nOrders)} orders, {fmt(ds.nLines)} item lines.</div>}
      </div>
    </div>
  )
}
