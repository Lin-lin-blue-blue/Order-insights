// Turns cleaned lines into compact typed arrays: one entry per order, plus a list of items per order.
const group = (c) => c.replace(/\s*-\s*delivery\s*$/i, '').trim() || 'Uncategorised'

export function buildDataset(lines) {
  const orderIdx = new Map(), items = new Map(), cats = new Map(), svcs = new Map(), outs = new Map()
  const id = (m, k) => { let v = m.get(k); if (v === undefined) { v = m.size; m.set(k, v) } return v }
  const L = lines.length
  const lo = new Uint32Array(L), li = new Uint16Array(L), lq = new Float32Array(L), lc = new Uint16Array(L)
  const oStart = [], oEnd = [], oSvc = [], oOut = [], oPax = []
  for (let k = 0; k < L; k++) {
    const r = lines[k]
    let o = orderIdx.get(r[0])
    if (o === undefined) { o = orderIdx.size; orderIdx.set(r[0], o); oStart.push(r[4]); oEnd.push(r[5]); oSvc.push(id(svcs, r[6])); oOut.push(id(outs, r[7])); oPax.push(r[8]) }
    lo[k] = o; li[k] = id(items, r[1]); lq[k] = r[2]; lc[k] = id(cats, group(r[3]))
  }
  if (items.size > 65535) throw new Error('More than 65,535 different items.')
  const n = orderIdx.size
  const off = new Uint32Array(n + 1)
  for (let k = 0; k < L; k++) off[lo[k] + 1]++
  for (let i = 0; i < n; i++) off[i + 1] += off[i]
  const cur = off.slice(0, n)
  const lItem = new Uint16Array(L), lQty = new Float32Array(L), lCat = new Uint16Array(L)
  for (let k = 0; k < L; k++) { const p = cur[lo[k]]++; lItem[p] = li[k]; lQty[p] = lq[k]; lCat[p] = lc[k] }

  const oDay = new Int32Array(n), oHour = new Uint8Array(n), oDow = new Uint8Array(n), oSvcA = new Uint8Array(n), oOutA = new Uint8Array(n)
  const oN = new Uint16Array(n), oUnits = new Float32Array(n), oPaxA = new Uint16Array(n), oDur = new Float32Array(n)
  const stats = { negDur: 0, over120: 0, pax30: 0, single: 0, maxItems: 0, hourMin: 23, hourMax: 0, dayMin: Infinity, dayMax: -Infinity, noEnd: 0 }
  const itemOrders = new Uint32Array(items.size)
  for (let o = 0; o < n; o++) {
    const d = new Date(oStart[o])
    oDay[o] = Math.floor(oStart[o] / 86400000); oHour[o] = d.getUTCHours(); oDow[o] = (d.getUTCDay() + 6) % 7
    oSvcA[o] = oSvc[o]; oOutA[o] = oOut[o]; oPaxA[o] = Math.min(65535, Math.max(0, Math.round(oPax[o])))
    oN[o] = off[o + 1] - off[o]
    let u = 0
    for (let p = off[o]; p < off[o + 1]; p++) { u += lQty[p]; itemOrders[lItem[p]]++ }
    oUnits[o] = u
    const dur = (oEnd[o] - oStart[o]) / 60000
    oDur[o] = Number.isNaN(dur) ? NaN : dur
    if (Number.isNaN(dur)) stats.noEnd++
    else if (dur < 0) stats.negDur++
    else if (dur > 120) stats.over120++
    if (oPaxA[o] > 30) stats.pax30++
    if (oN[o] === 1) stats.single++
    if (oN[o] > stats.maxItems) stats.maxItems = oN[o]
    if (oHour[o] < stats.hourMin) stats.hourMin = oHour[o]
    if (oHour[o] > stats.hourMax) stats.hourMax = oHour[o]
    if (oDay[o] < stats.dayMin) stats.dayMin = oDay[o]
    if (oDay[o] > stats.dayMax) stats.dayMax = oDay[o]
  }
  return {
    nOrders: n, nLines: L,
    items: [...items.keys()], cats: [...cats.keys()], services: [...svcs.keys()], outlets: [...outs.keys()],
    oDay, oHour, oDow, oSvc: oSvcA, oOut: oOutA, oN, oUnits, oPax: oPaxA, oDur, off, lItem, lQty, lCat, itemOrders, stats,
  }
}
