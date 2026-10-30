// Makes public/sample_orders.csv: 3,500 made-up orders, same columns as the real export. Run: node tools/make_sample.mjs
import fs from 'fs'
let seed = 7
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
const pick = (a) => a[Math.floor(rnd() * a.length)]
const wpick = (a) => { let r = rnd() * a.reduce((s, x) => s + x[1], 0); for (const x of a) { r -= x[1]; if (r <= 0) return x[0] } return a[0][0] }
const mains = [['Mapo Tofu - A La Carte', 'Main course', 10], ['Sweet & Sour Pork', 'Main course', 8], ['Kung Pao Chicken', 'Main course', 8], ['Fried Rice', 'Rice & noodles', 9], ['Dumplings', 'Dim sum', 6], ['Spring Rolls', 'Dim sum', 5], ['Beef Noodle Soup', 'Rice & noodles', 6], ['Braised Eggplant', 'Vegetables', 4]]
const cat = Object.fromEntries([...mains.map((m) => [m[0], m[1]]), ['Steamed Rice', 'Rice & noodles'], ['Stir-fried Greens', 'Vegetables'], ['Egg Drop Soup', 'Soup'], ['Hot & Sour Soup', 'Soup'], ['Iced Lemon Tea', 'Drinks'], ['Mango Pudding', 'Dessert'], ['Jasmine Tea', 'Drinks']])
const riceMains = new Set(['Mapo Tofu - A La Carte', 'Sweet & Sour Pork', 'Kung Pao Chicken', 'Braised Eggplant'])
const services = [['Dine-In', 74], ['Grab', 18], ['Take-Away', 7.5], ['eGET', 0.5]]
const outlets = [['S-ASS02', 14], ['S-IFL02', 12], ['S-FML01', 11], ['S-TKK01', 9], ['S-BTB01', 8], ['S-SRP01', 7]]
const shape = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 14, 10, 5, 3, 3, 6, 12, 13, 7, 2, 0, 0, 0]
const med = { 'Dine-In': 50, Grab: 38, 'Take-Away': 16, eGET: 41 }
const pad = (n) => String(n).padStart(2, '0')
const fd = (ms) => { const d = new Date(ms); return [`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`, `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`] }
const q = (s) => (/[",]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s)
const out = ['Transaction_ID,Item_Name,QTY,Pax,Category,Start_Date,Start_Time,End_Date,End_Time,Service_Type,Outlet_Code,Modifier,Order_description,Net_Amount']
const t0 = Date.UTC(2026, 6, 6), days = 91
for (let i = 0; i < 3500; i++) {
  let day = Math.floor(rnd() * days)
  const dow = (new Date(t0 + day * 86400000).getUTCDay() + 6) % 7
  if (dow < 5 && rnd() < 0.3) day = Math.min(days - 1, day + (5 - dow))
  const hour = +wpick(shape.map((w, h) => [h, w]))
  const start = t0 + day * 86400000 + hour * 3600000 + Math.floor(rnd() * 3600000)
  const svc = wpick(services), outlet = wpick(outlets)
  const delivery = svc === 'Grab' || svc === 'eGET'
  let dur = med[svc] * Math.exp((rnd() + rnd() + rnd() - 1.5) * 0.7)
  if (rnd() < 0.003) dur = -dur
  if (delivery && rnd() < 0.03) dur += 130
  const end = start + dur * 60000
  const pax = svc === 'Dine-In' ? (rnd() < 0.01 ? 55 : 1 + Math.min(10, Math.floor(-Math.log(1 - rnd()) * 2.6))) : 0
  const items = new Map()
  const add = (n, qty = 1) => items.set(n, (items.get(n) || 0) + qty)
  const nm = rnd() < 0.2 ? 1 : 1 + Math.floor(rnd() * 3)
  const ms = []
  for (let k = 0; k < nm; k++) { const m = wpick(mains.map((x) => [x[0], x[2]])); ms.push(m); add(m, rnd() < 0.2 ? 2 : 1) }
  if (!(nm === 1 && rnd() < 0.2)) {
    for (const m of ms) {
      if (riceMains.has(m)) { if (rnd() < 0.65) add('Steamed Rice', Math.max(1, Math.min(4, pax || 1))) } else if (rnd() < 0.12) add('Steamed Rice')
      if (rnd() < 0.3) add('Stir-fried Greens')
      if (m === 'Fried Rice' && rnd() < 0.5) add('Egg Drop Soup')
      if (m === 'Dumplings' && rnd() < 0.45) add('Hot & Sour Soup')
      if (m === 'Spring Rolls' && rnd() < 0.5) add('Iced Lemon Tea')
    }
    if (rnd() < 0.15) add('Egg Drop Soup')
    if (rnd() < 0.2) add('Iced Lemon Tea')
    if (items.has('Iced Lemon Tea') && rnd() < 0.3) add('Mango Pudding')
    if (rnd() < 0.08) add('Jasmine Tea', pax || 1)
  }
  const [sd, st] = fd(start), [ed, et] = fd(end)
  const id = 'T' + (100000 + i)
  const names = [...items.keys()]
  for (const n of names) out.push([id, q(n), items.get(n), pax, delivery ? cat[n] + '-Delivery' : cat[n], sd, st, ed, et, svc, outlet, '-', '', (items.get(n) * 4.5).toFixed(2)].join(','))
  if (rnd() < 0.3) out.push([id, q(pick(names)), 1, pax, '', sd, st, ed, et, svc, outlet, 'Less spicy', '', '0.00'].join(','))
}
fs.writeFileSync('public/sample_orders.csv', out.join('\n') + '\n')
console.log(out.length - 1, 'rows')
