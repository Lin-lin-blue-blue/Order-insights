import { useMemo, useState } from 'react'
import { analyze } from '../lib/analytics.js'
import { fmt, DAYS, dayToISO, isoToDay } from '../lib/format.js'
import { Card, Col, Line, HBar, Donut, Heat, Box, Empty, SC } from '../components/charts.jsx'

export default function Dashboard({ ds }) {
  const st = ds.stats
  const [sv, setSv] = useState(() => new Set(ds.services.map((_, i) => i)))
  const [outlet, setOutlet] = useState(-1)
  const [dayType, setDayType] = useState('all')
  const [from, setFrom] = useState(st.dayMin)
  const [to, setTo] = useState(st.dayMax)
  const toggle = (i) => setSv((s) => { const n = new Set(s); n.has(i) ? n.size > 1 && n.delete(i) : n.add(i); return n })
  const a = useMemo(() => analyze(ds, { sv, outlet, dayType, from, to }), [ds, sv, outlet, dayType, from, to])
  const HRS = []
  for (let h = st.hourMin; h <= st.hourMax; h++) HRS.push(h)
  const hourLabel = (h) => h + ':00'
  const histData = []
  for (let n = 1; n < a.hist.length; n++) histData.push([String(n), a.hist[n]])
  const partyData = []
  for (let n = 1; n <= 30; n++) partyData.push([String(n), a.party[n]])
  const dur = a.dur, durAll = dur.valid + dur.over + dur.neg
  const kpi = [
    ['Orders', fmt(a.total)],
    ['Items per order', a.total ? a.avgItems.toFixed(2) : '–'],
    ['Single-item orders', a.total ? a.singlePct.toFixed(1) + '%' : '–'],
    ['Median duration', Number.isNaN(a.medianDur) ? '–' : Math.round(a.medianDur) + ' min'],
    ['Busiest hour', a.busiest === null ? '–' : hourLabel(a.busiest)],
  ]
  return (
    <div>
      <div className="sticky top-0 z-10 py-3 flex flex-wrap gap-x-6 gap-y-2 items-center border-b" style={{ background: 'var(--bg)', borderColor: 'var(--line)' }}>
        <div className="flex flex-wrap gap-1.5 items-center"><span className="lab mr-1">Service</span>{ds.services.map((s, i) => <button key={s} className="btn" aria-pressed={sv.has(i)} onClick={() => toggle(i)}>{s}</button>)}</div>
        <div className="flex gap-2 items-center"><label htmlFor="o" className="lab">Outlet</label>
          <select id="o" value={outlet} onChange={(e) => setOutlet(+e.target.value)}><option value={-1}>All outlets</option>{ds.outlets.map((o, i) => <option key={o} value={i}>{o}</option>)}</select></div>
        <div className="flex gap-1.5 items-center"><span className="lab mr-1">Days</span>{[['all', 'All days'], ['wk', 'Weekdays'], ['we', 'Weekend']].map(([k, l]) => <button key={k} className="btn" aria-pressed={dayType === k} onClick={() => setDayType(k)}>{l}</button>)}</div>
        <div className="flex gap-2 items-center"><label htmlFor="d1" className="lab">From</label><input id="d1" type="date" value={dayToISO(from)} min={dayToISO(st.dayMin)} max={dayToISO(to)} onChange={(e) => e.target.value && setFrom(isoToDay(e.target.value))} />
          <label htmlFor="d2" className="lab">To</label><input id="d2" type="date" value={dayToISO(to)} min={dayToISO(from)} max={dayToISO(st.dayMax)} onChange={(e) => e.target.value && setTo(isoToDay(e.target.value))} /></div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-4">
        {kpi.map((x) => <div key={x[0]} className="card p-3"><div className="lab">{x[0]}</div><div className="mono text-2xl font-medium mt-1">{x[1]}</div></div>)}
      </div>

      <div className="sec">When do customers order</div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Orders by hour" sub="Total orders in each hour of the day"><Line labels={HRS.map(hourLabel)} series={[{ name: 'Orders', vals: HRS.map((h) => a.hour[h]), color: 'var(--c2)', area: true }]} label="Orders by hour" /></Card>
        <Card title="Orders by weekday" sub="Total orders on each day of the week"><Col data={DAYS.map((d, i) => [d, a.dow[i]])} label="Orders by weekday" /></Card>
        <Card title="Weekday vs weekend" sub="Average orders per day"><Col data={[['Weekday', a.avgDay.wk], ['Weekend', a.avgDay.we]]} color="var(--c1)" label="Weekday vs weekend" /></Card>
        <Card title="Hour by weekday" sub="Darker means more orders"><Heat grid={a.grid} hours={HRS} /></Card>
        <Card wide title="Orders per day" sub="Daily trend across the selected dates"><Line labels={a.trend.map((t) => dayToISO(t[0]).slice(5))} series={[{ name: 'Orders', vals: a.trend.map((t) => t[1]), color: 'var(--c2)', area: true }]} W={900} h={200} label="Orders per day" /></Card>
      </div>

      <div className="sec">What customers buy</div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Units by category" sub="Total QTY sold. Delivery categories are merged with their dine-in category."><HBar data={a.cats} /></Card>
        <Card title="Top 10 items" sub="Units sold"><HBar data={a.items} color="var(--c1)" /></Card>
        <Card title="Different items per order" sub="Every basket size is shown, none grouped"><Col data={histData} label="Items per order" /></Card>
        <Card title="Party size (dine-in)" sub="Pax from 1 to 30. Larger values are treated as entry errors and left out.">{a.party.some((v) => v > 0) ? <Col data={partyData} color="var(--c3)" label="Party size" /> : <Empty>Select a dine-in service to see party size.</Empty>}</Card>
      </div>

      <div className="sec">Service and outlets</div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Service type" sub="Share of selected orders"><Donut parts={ds.services.map((s, i) => [s, a.svc[i]]).filter((p) => p[1] > 0)} /></Card>
        <Card title="Orders by outlet" sub="Selected outlet is highlighted"><HBar data={ds.outlets.map((o, i) => [o, a.outl[i]]).filter((x) => x[1] > 0).sort((x, y) => y[1] - x[1])} hl={outlet >= 0 ? ds.outlets[outlet] : undefined} max={20} /></Card>
        <Card title="Order duration by service type" sub="Minutes. Line = range, box = middle half, bold mark = median.">
          <Box items={a.box} />
          {durAll > 0 && <div className="lab mt-2">Left out: {fmt(dur.over)} orders over 2 hours ({((dur.over / durAll) * 100).toFixed(1)}%) and {fmt(dur.neg)} with a negative duration. Delivery times include rider waiting.</div>}
        </Card>
        <Card title="Median duration by hour" sub="Minutes from order start to end"><Line labels={HRS.map(hourLabel)} series={[{ name: 'Median', vals: HRS.map((h) => a.durHour[h]), color: 'var(--c1)' }]} unit="m" label="Median duration by hour" /></Card>
      </div>
    </div>
  )
}
