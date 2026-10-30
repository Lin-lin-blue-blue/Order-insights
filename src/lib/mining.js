import { fpgrowth } from './fpgrowth.js'

// Settings: { minSup (0-1), minConf (0-1), maxLen, twoPlus }
// Rules have one item on the right side ("then also order C") and any number of items on the left.
export function runMining(ds, s) {
  const t0 = Date.now()
  const baskets = []
  for (let o = 0; o < ds.nOrders; o++) {
    const len = ds.off[o + 1] - ds.off[o]
    if (s.twoPlus && len < 2) continue
    baskets.push(ds.lItem.subarray(ds.off[o], ds.off[o + 1]))
  }
  const n = baskets.length
  const minCount = Math.max(1, Math.ceil(s.minSup * n))
  const { found, capped, nFreqItems } = fpgrowth(baskets, ds.items.length, minCount, s.maxLen)
  const sizeCounts = []
  const rules = []
  for (const [key, cnt] of found) {
    const ids = key.split(',').map(Number)
    sizeCounts[ids.length - 1] = (sizeCounts[ids.length - 1] || 0) + 1
    if (ids.length < 2) continue
    for (const c of ids) {
      const a = ids.filter((x) => x !== c)
      const supA = found.get(a.join(','))
      const supC = found.get(String(c))
      if (!supA || !supC) continue
      const conf = cnt / supA
      if (conf < s.minConf) continue
      rules.push({ a, c, sup: cnt / n, conf, lift: conf / (supC / n), count: cnt })
    }
  }
  rules.sort((x, y) => y.lift - x.lift)
  const total = rules.length
  return { rules: rules.slice(0, 20000), total, sizeCounts: Array.from(sizeCounts, (v) => v || 0), nTrans: n, nFreqItems, capped, ms: Date.now() - t0 }
}
