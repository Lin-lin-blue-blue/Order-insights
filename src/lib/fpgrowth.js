// FP-Growth with a maximum itemset length and a safety cap.
// baskets: array of arrays of item ids. Returns Map("id,id,id" sorted -> count).
export function fpgrowth(baskets, nItems, minCount, maxLen, cap = 200000) {
  const freq = new Int32Array(nItems)
  for (const b of baskets) for (const i of b) freq[i]++
  const order = []
  for (let i = 0; i < nItems; i++) if (freq[i] >= minCount) order.push(i)
  order.sort((a, b) => freq[b] - freq[a] || a - b)
  const rank = new Int32Array(nItems).fill(-1)
  order.forEach((it, r) => { rank[it] = r })

  const found = new Map()
  let capped = false
  const record = (ranks, cnt) => {
    if (found.size >= cap) { capped = true; return }
    const ids = ranks.map((r) => order[r]).sort((a, b) => a - b)
    found.set(ids.join(','), cnt)
  }
  const makeTree = () => ({ root: { item: -1, count: 0, parent: null, children: new Map(), next: null }, header: new Map() })
  const insert = (tree, path, w) => {
    let n = tree.root
    for (const it of path) {
      let c = n.children.get(it)
      if (!c) {
        c = { item: it, count: 0, parent: n, children: new Map(), next: null }
        n.children.set(it, c)
        const h = tree.header.get(it)
        if (h) { c.next = h.head; h.head = c } else tree.header.set(it, { head: c, count: 0 })
      }
      c.count += w
      tree.header.get(it).count += w
      n = c
    }
  }
  const tree = makeTree()
  for (const b of baskets) {
    const r = []
    for (const i of b) { const k = rank[i]; if (k >= 0) r.push(k) }
    if (r.length) { r.sort((x, y) => x - y); insert(tree, r, 1) }
  }
  const grow = (t, suffix) => {
    const its = [...t.header.keys()].sort((a, b) => b - a)
    for (const it of its) {
      if (capped) return
      const h = t.header.get(it)
      const set = [it, ...suffix]
      record(set, h.count)
      if (set.length >= maxLen) continue
      const base = [], cc = new Map()
      for (let n = h.head; n; n = n.next) {
        const path = []
        for (let p = n.parent; p && p.item >= 0; p = p.parent) path.push(p.item)
        if (path.length) { path.reverse(); base.push([path, n.count]); for (const x of path) cc.set(x, (cc.get(x) || 0) + n.count) }
      }
      if (!base.length) continue
      const ct = makeTree()
      for (const [path, w] of base) { const f = path.filter((x) => cc.get(x) >= minCount); if (f.length) insert(ct, f, w) }
      if (ct.header.size) grow(ct, set)
    }
  }
  grow(tree, [])
  return { found, capped, nFreqItems: order.length }
}
