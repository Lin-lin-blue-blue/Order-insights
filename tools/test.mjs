import fs from 'fs'
import Papa from 'papaparse'
import { guessMapping, missingRequired, Cleaner } from '../src/lib/clean.js'
import { buildDataset } from '../src/lib/build.js'
import { runMining } from '../src/lib/mining.js'
import { analyze } from '../src/lib/analytics.js'
const rows = Papa.parse(fs.readFileSync('public/sample_orders.csv', 'utf8'), { skipEmptyLines: true }).data
const m = guessMapping(rows[0]); console.log('missing', missingRequired(m), m)
const c = new Cleaner(m, { modifierDash: true, batch: 1 }); for (let i = 1; i < rows.length; i++) c.add(rows[i])
const { lines, stats } = c.finish(); console.log(stats)
let t = Date.now(); const ds = buildDataset(lines); console.log('build ms', Date.now() - t, ds.nOrders, ds.items.length, ds.stats)
for (const maxLen of [3, 6, 8]) { t = Date.now(); const r = runMining(ds, { minSup: 0.01, minConf: 0.3, maxLen, twoPlus: false }); console.log('maxLen', maxLen, 'rules', r.total, 'sizes', r.sizeCounts, 'ms', Date.now() - t, r.rules[0] && ds.items[r.rules[0].c]) }
const a = analyze(ds, { sv: null, outlet: -1, dayType: 'all', from: ds.stats.dayMin, to: ds.stats.dayMax })
console.log(a.total, a.avgItems.toFixed(2), a.singlePct.toFixed(1), a.medianDur.toFixed(1), a.busiest, a.avgDay, a.dur, a.cats.slice(0,3), a.box.map(b=>b[0]))
