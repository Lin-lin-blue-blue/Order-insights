// Applies the dashboard filters and returns every number the charts need.
const quantile = (a, q) => {
  if (!a.length) return NaN
  const p = (a.length - 1) * q, lo = Math.floor(p), hi = Math.ceil(p)
  return a[lo] + (a[hi] - a[lo]) * (p - lo)
}
const sortNum = (arr) => Float64Array.from(arr).sort()

export function analyze(ds, f) {
  const nS = ds.services.length
  const hour = new Float64Array(24), dow = new Float64Array(7), svc = new Float64Array(nS), outl = new Float64Array(ds.outlets.length)
  const grid = Array.from({ length: 7 }, () => new Float64Array(24))
  const hist = new Float64Array(ds.stats.maxItems + 1), party = new Float64Array(31)
  const dayCount = new Map(), wkDays = new Set(), weDays = new Set()
  const durSvc = Array.from({ length: nS }, () => []), durHour = Array.from({ length: 24 }, () => [])
  const dineIdx = ds.services.map((s, i) => (/dine/i.test(s) ? i : -1)).filter((i) => i >= 0)
  const partyOK = (s) => (dineIdx.length ? dineIdx.includes(s) : true)
  const pass = new Uint8Array(ds.nOrders)
  let total = 0, sumItems = 0, single = 0, wk = 0, we = 0, durValid = 0, durOver = 0, durNeg = 0, durNone = 0
  const allDur = []

  for (let o = 0; o < ds.nOrders; o++) {
    const s = ds.oSvc[o]
    if (f.sv && !f.sv.has(s)) continue
    if (f.outlet >= 0 && ds.oOut[o] !== f.outlet) continue
    const d = ds.oDay[o]
    if (d < f.from || d > f.to) continue
    const dw = ds.oDow[o]
    if (f.dayType === 'wk' && dw > 4) continue
    if (f.dayType === 'we' && dw < 5) continue
    pass[o] = 1
    total++
    const h = ds.oHour[o]
    hour[h]++; dow[dw]++; grid[dw][h]++; svc[s]++; outl[ds.oOut[o]]++
    sumItems += ds.oN[o]; if (ds.oN[o] === 1) single++
    hist[ds.oN[o]]++
    dayCount.set(d, (dayCount.get(d) || 0) + 1)
    if (dw > 4) { we++; weDays.add(d) } else { wk++; wkDays.add(d) }
    const px = ds.oPax[o]
    if (px >= 1 && px <= 30 && partyOK(s)) party[px]++
    const du = ds.oDur[o]
    if (Number.isNaN(du)) durNone++
    else if (du < 0) durNeg++
    else if (du > 120) durOver++
    else { durValid++; durSvc[s].push(du); durHour[h].push(du); allDur.push(du) }
  }

  const catUnits = new Float64Array(ds.cats.length), itemUnits = new Float64Array(ds.items.length)
  for (let o = 0; o < ds.nOrders; o++) {
    if (!pass[o]) continue
    for (let p = ds.off[o]; p < ds.off[o + 1]; p++) { catUnits[ds.lCat[p]] += ds.lQty[p]; itemUnits[ds.lItem[p]] += ds.lQty[p] }
  }
  const ranked = (arr, names) => Array.from(arr, (v, i) => [names[i], v]).filter((x) => x[1] > 0).sort((a, b) => b[1] - a[1])
  const box = durSvc.map((a, i) => {
    if (!a.length) return null
    const s = sortNum(a)
    return [ds.services[i], [s[0], quantile(s, 0.25), quantile(s, 0.5), quantile(s, 0.75), s[s.length - 1]], a.length]
  }).filter(Boolean)
  const med = (a) => (a.length ? quantile(sortNum(a), 0.5) : 0)
  const trend = [...dayCount.entries()].sort((a, b) => a[0] - b[0])
  let busiest = 0
  for (let h = 1; h < 24; h++) if (hour[h] > hour[busiest]) busiest = h
  return {
    total, avgItems: total ? sumItems / total : 0, singlePct: total ? (single / total) * 100 : 0,
    medianDur: allDur.length ? med(allDur) : NaN, busiest: total ? busiest : null,
    avgDay: { wk: wkDays.size ? wk / wkDays.size : 0, we: weDays.size ? we / weDays.size : 0 },
    hour, dow, grid, svc, outl, hist, party, trend,
    cats: ranked(catUnits, ds.cats), items: ranked(itemUnits, ds.items).slice(0, 10),
    box, durHour: durHour.map(med), dur: { valid: durValid, over: durOver, neg: durNeg, none: durNone },
  }
}
