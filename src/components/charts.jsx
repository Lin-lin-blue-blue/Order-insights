import { fmt, short, niceMax, DAYS } from '../lib/format.js'

export const SC = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)']

export function Card({ title, sub, children, wide }) {
  return (
    <div className={'card p-4 min-w-0 ' + (wide ? 'lg:col-span-2' : '')}>
      <div className="font-semibold text-[15px]">{title}</div>
      {sub ? <div className="lab mb-3">{sub}</div> : <div className="mb-3" />}
      {children}
    </div>
  )
}

export function Empty({ children = 'No orders match these filters.' }) {
  return <div className="lab py-10 text-center">{children}</div>
}

export function Col({ data, color = 'var(--c2)', h = 190, fmtv = fmt, label }) {
  if (!data.length || !data.some((d) => d[1] > 0)) return <Empty />
  const W = 420, l = 42, b = 24, t = 8, r = 6
  const mx = niceMax(Math.max(...data.map((d) => d[1]), 1)), bw = (W - l - r) / data.length, ph = h - b - t
  const every = Math.ceil(data.length / 14)
  return (
    <svg viewBox={`0 0 ${W} ${h}`} className="w-full" role="img" aria-label={label}>
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <g key={f}>
          <line x1={l} x2={W - r} y1={t + ph * (1 - f)} y2={t + ph * (1 - f)} stroke="var(--line)" />
          <text x={l - 5} y={t + ph * (1 - f) + 3} textAnchor="end" fontSize="9" fill="var(--mut)">{short(Math.round(mx * f))}</text>
        </g>
      ))}
      {data.map((d, i) => {
        const bh = (ph * d[1]) / mx
        return (
          <g key={d[0] + '-' + i}>
            <rect x={l + i * bw + bw * 0.14} y={t + ph - bh} width={bw * 0.72} height={bh} fill={color}><title>{d[0]}: {fmtv(d[1])}</title></rect>
            {i % every === 0 && <text x={l + i * bw + bw / 2} y={h - 8} textAnchor="middle" fontSize="9" fill="var(--mut)">{d[0]}</text>}
          </g>
        )
      })}
    </svg>
  )
}

export function Line({ labels, series, h = 190, W = 420, unit = '', label }) {
  if (labels.length < 2 || !series.some((s) => s.vals.some((v) => v > 0))) return <Empty />
  const l = 42, b = 24, t = 10, r = 10
  const mx = niceMax(Math.max(...series.flatMap((s) => s.vals), 1)), ph = h - b - t, step = (W - l - r) / (labels.length - 1)
  const P = (i, v) => [l + i * step, t + ph * (1 - v / mx)]
  const every = Math.ceil(labels.length / 8)
  return (
    <svg viewBox={`0 0 ${W} ${h}`} className="w-full" role="img" aria-label={label}>
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <g key={f}>
          <line x1={l} x2={W - r} y1={t + ph * (1 - f)} y2={t + ph * (1 - f)} stroke="var(--line)" />
          <text x={l - 5} y={t + ph * (1 - f) + 3} textAnchor="end" fontSize="9" fill="var(--mut)">{short(Math.round(mx * f))}{unit}</text>
        </g>
      ))}
      {labels.map((x, i) => i % every === 0 && <text key={x + i} x={P(i, 0)[0]} y={h - 8} textAnchor="middle" fontSize="9" fill="var(--mut)">{x}</text>)}
      {series.map((s) => {
        const pts = s.vals.map((v, i) => P(i, v))
        return (
          <g key={s.name}>
            {s.area && <polygon points={`${pts[0][0]},${t + ph} ${pts.map((p) => p.join(',')).join(' ')} ${pts[pts.length - 1][0]},${t + ph}`} fill={s.color} opacity=".14" />}
            <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={s.color} strokeWidth="2" />
            {labels.length <= 40 && pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill={s.color}><title>{labels[i]}: {fmt(s.vals[i])}{unit}</title></circle>)}
          </g>
        )
      })}
    </svg>
  )
}

export function HBar({ data, color = 'var(--c2)', hl, fmtv = fmt, max = 12 }) {
  if (!data.length) return <Empty />
  const rows = data.slice(0, max)
  const mx = Math.max(...rows.map((d) => d[1]), 1)
  return (
    <div className="flex flex-col gap-1.5">
      {rows.map((d) => (
        <div key={d[0]} className="flex items-center gap-2 text-[13px]">
          <div className="w-36 shrink-0 truncate" title={d[0]}>{d[0]}</div>
          <div className="flex-1 h-3.5" style={{ background: 'var(--bg)' }}>
            <div className="h-3.5" style={{ width: (d[1] / mx) * 100 + '%', background: hl !== undefined && hl !== null && hl !== d[0] ? 'var(--c4)' : color }} />
          </div>
          <div className="mono text-xs w-14 text-right">{fmtv(d[1])}</div>
        </div>
      ))}
      {data.length > max && <div className="lab">Showing the top {max} of {data.length}</div>}
    </div>
  )
}

export function Donut({ parts }) {
  const tot = parts.reduce((a, p) => a + p[1], 0)
  if (!tot) return <Empty />
  const R = 42, C = 2 * Math.PI * R
  let off = 0
  return (
    <div className="flex items-center gap-5 flex-wrap">
      <svg viewBox="0 0 120 120" className="w-36 shrink-0" role="img" aria-label="Service type share">
        <g transform="rotate(-90 60 60)">
          {parts.map((p, i) => {
            const len = (p[1] / tot) * C
            const e = <circle key={p[0]} cx="60" cy="60" r={R} fill="none" stroke={SC[i % SC.length]} strokeWidth="18" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off}><title>{p[0]}: {((p[1] / tot) * 100).toFixed(1)}%</title></circle>
            off += len
            return e
          })}
        </g>
        <text x="60" y="58" textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--fg)">{fmt(tot)}</text>
        <text x="60" y="71" textAnchor="middle" fontSize="8" fill="var(--mut)">orders</text>
      </svg>
      <ul className="text-[13px] flex flex-col gap-1.5">
        {parts.map((p, i) => (
          <li key={p[0]} className="flex items-center gap-2"><span className="inline-block w-3 h-3" style={{ background: SC[i % SC.length] }} />{p[0]}<span className="mono text-xs" style={{ color: 'var(--mut)' }}>{((p[1] / tot) * 100).toFixed(1)}%</span></li>
        ))}
      </ul>
    </div>
  )
}

export function Heat({ grid, hours }) {
  const W = 420, l = 30, t = 4, cw = (W - l - 4) / hours.length, ch = 20
  const mx = Math.max(...grid.flatMap((r) => hours.map((h) => r[h])), 1)
  if (mx <= 1 && grid.every((r) => hours.every((h) => !r[h]))) return <Empty />
  return (
    <svg viewBox={`0 0 ${W} ${t + 7 * ch + 18}`} className="w-full" role="img" aria-label="Orders by weekday and hour">
      {grid.map((row, d) => (
        <g key={d}>
          <text x={l - 5} y={t + d * ch + ch / 2 + 3} textAnchor="end" fontSize="9" fill="var(--mut)">{DAYS[d]}</text>
          {hours.map((h, i) => <rect key={h} x={l + i * cw} y={t + d * ch} width={cw - 1} height={ch - 1} fill="var(--c2)" fillOpacity={0.06 + (0.94 * row[h]) / mx}><title>{DAYS[d]} {h}:00 · {fmt(row[h])} orders</title></rect>)}
        </g>
      ))}
      {hours.map((h, i) => i % 2 === 0 && <text key={h} x={l + i * cw + cw / 2} y={t + 7 * ch + 12} textAnchor="middle" fontSize="9" fill="var(--mut)">{h}</text>)}
    </svg>
  )
}

export function Box({ items }) {
  if (!items.length) return <Empty>No durations to show.</Empty>
  const W = 420, l = 70, r = 12, rh = 34, mx = 125
  const X = (v) => l + ((W - l - r) * v) / mx
  return (
    <svg viewBox={`0 0 ${W} ${items.length * rh + 26}`} className="w-full" role="img" aria-label="Order duration by service type">
      {[0, 30, 60, 90, 120].map((v) => (
        <g key={v}><line x1={X(v)} x2={X(v)} y1="2" y2={items.length * rh + 2} stroke="var(--line)" /><text x={X(v)} y={items.length * rh + 16} textAnchor="middle" fontSize="9" fill="var(--mut)">{v}</text></g>
      ))}
      {items.map((it, i) => {
        const y = i * rh + rh / 2 + 2
        const [mn, q1, md, q3, mxv] = it[1]
        return (
          <g key={it[0]}>
            <text x={l - 8} y={y + 3} textAnchor="end" fontSize="10" fill="var(--fg)">{it[0]}</text>
            <line x1={X(mn)} x2={X(mxv)} y1={y} y2={y} stroke="var(--c3)" strokeWidth="1.5" />
            <line x1={X(mn)} x2={X(mn)} y1={y - 5} y2={y + 5} stroke="var(--c3)" />
            <line x1={X(mxv)} x2={X(mxv)} y1={y - 5} y2={y + 5} stroke="var(--c3)" />
            <rect x={X(q1)} y={y - 10} width={Math.max(1, X(q3) - X(q1))} height="20" fill="var(--c2)" fillOpacity=".25" stroke="var(--c2)"><title>{it[0]}: median {md.toFixed(0)} min, middle half {q1.toFixed(0)}–{q3.toFixed(0)} min, {fmt(it[2])} orders</title></rect>
            <line x1={X(md)} x2={X(md)} y1={y - 10} y2={y + 10} stroke="var(--c1)" strokeWidth="2.5" />
          </g>
        )
      })}
    </svg>
  )
}

export function Scatter({ rules }) {
  if (!rules.length) return <Empty>No rules at these settings.</Empty>
  const W = 420, H = 210, l = 40, b = 26, t = 8, r = 12
  const mxS = niceMax(Math.max(...rules.map((q) => q.sup * 100)) * 1.05)
  const cLo = Math.floor(Math.min(...rules.map((q) => q.conf * 100)) / 10) * 10, cHi = Math.max(cLo + 10, Math.ceil(Math.max(...rules.map((q) => q.conf * 100)) / 10) * 10)
  const X = (v) => l + ((W - l - r) * v * 100) / mxS
  const Y = (v) => t + (H - t - b) * (1 - (v * 100 - cLo) / (cHi - cLo))
  const yt = [cLo, (cLo + cHi) / 2, cHi]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Rules: support against confidence">
      {yt.map((v) => <g key={v}><line x1={l} x2={W - r} y1={Y(v / 100)} y2={Y(v / 100)} stroke="var(--line)" /><text x={l - 5} y={Y(v / 100) + 3} textAnchor="end" fontSize="9" fill="var(--mut)">{v}%</text></g>)}
      {[0, 0.25, 0.5, 0.75, 1].map((f) => <text key={f} x={X((mxS * f) / 100)} y={H - 12} textAnchor="middle" fontSize="9" fill="var(--mut)">{+(mxS * f).toFixed(1)}%</text>)}
      <text x={(l + W) / 2} y={H - 1} textAnchor="middle" fontSize="9" fill="var(--mut)">Support (share of orders)</text>
      {rules.slice(0, 600).map((q, i) => <circle key={i} cx={X(q.sup)} cy={Y(q.conf)} r={Math.min(9, 2.5 + q.lift * 1.3)} fill="var(--c2)" fillOpacity=".5" stroke="var(--c1)" />)}
    </svg>
  )
}
