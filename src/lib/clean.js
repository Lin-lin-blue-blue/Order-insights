import { parseDateTime } from './dt.js'

const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
const text = (v) => (v === null || v === undefined ? '' : String(v).trim())
const num = (v) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/,/g, ''))
  return Number.isFinite(n) ? n : 0
}

export const FIELDS = [
  { key: 'tid', label: 'Order ID', req: true, alias: ['transactionid', 'orderid', 'transaction', 'billno', 'invoiceno', 'receiptno', 'checkid'] },
  { key: 'item', label: 'Item name', req: true, alias: ['itemname', 'item', 'product', 'productname', 'menuitem', 'menuname'] },
  { key: 'qty', label: 'Quantity', req: true, alias: ['qty', 'quantity', 'qnty'] },
  { key: 'category', label: 'Category', req: true, alias: ['category', 'itemcategory', 'menucategory'] },
  { key: 'startDate', label: 'Start date (or date + time)', req: true, alias: ['startdatetime', 'startdate', 'orderstart', 'opentime', 'orderdate'] },
  { key: 'startTime', label: 'Start time (if separate)', req: false, alias: ['starttime'] },
  { key: 'endDate', label: 'End date (or date + time)', req: true, alias: ['enddatetime', 'enddate', 'orderend', 'closetime'] },
  { key: 'endTime', label: 'End time (if separate)', req: false, alias: ['endtime'] },
  { key: 'service', label: 'Service type', req: true, alias: ['servicetype', 'service', 'ordertype', 'channel', 'ordermode'] },
  { key: 'outlet', label: 'Outlet', req: true, alias: ['outletcode', 'outlet', 'storecode', 'store', 'branch'] },
  { key: 'pax', label: 'Party size (Pax)', req: false, alias: ['pax', 'guests', 'covers', 'partysize'] },
  { key: 'modifier', label: 'Modifier', req: false, alias: ['modifier', 'modifiers'] },
]

export function guessMapping(headers) {
  const n = headers.map(norm)
  const used = new Set()
  const m = {}
  for (const f of FIELDS) {
    let idx = -1
    for (const a of f.alias) { const j = n.indexOf(a); if (j >= 0 && !used.has(j)) { idx = j; break } }
    if (idx < 0) for (const a of f.alias) { const j = n.findIndex((h, i) => !used.has(i) && h.includes(a)); if (j >= 0) { idx = j; break } }
    m[f.key] = idx
    if (idx >= 0) used.add(idx)
  }
  return m
}

export const missingRequired = (m) => FIELDS.filter((f) => f.req && (m[f.key] === undefined || m[f.key] < 0)).map((f) => f.label)

// Cleaning pipeline, one row at a time so a 500k-row file never has to sit in memory as objects.
// 1. keep rows whose Modifier is '-'   2. Pax to number   3. merge date + time   4. group by order + item (QTY summed)
// Line layout: [orderId, item, qty, category, startMs, endMs, service, outlet, pax, batchId]
export class Cleaner {
  constructor(map, opts) {
    this.m = map
    this.o = opts
    this.index = new Map()
    this.lines = []
    this.s = { raw: 0, noId: 0, modRemoved: 0, badDate: 0, kept: 0 }
  }
  add(row) {
    const m = this.m, s = this.s
    s.raw++
    const tid = text(row[m.tid]), item = text(row[m.item])
    if (!tid || !item) { s.noId++; return }
    if (this.o.modifierDash && m.modifier >= 0 && text(row[m.modifier]) !== '-') { s.modRemoved++; return }
    const key = tid + '\u0001' + item
    const ex = this.index.get(key)
    if (ex !== undefined) { this.lines[ex][2] += num(row[m.qty]); s.kept++; return }
    const st = parseDateTime(row[m.startDate], m.startTime >= 0 ? row[m.startTime] : null)
    if (isNaN(st)) { s.badDate++; return }
    const en = parseDateTime(row[m.endDate], m.endTime >= 0 ? row[m.endTime] : null)
    this.index.set(key, this.lines.length)
    this.lines.push([tid, item, num(row[m.qty]), text(row[m.category]), st, en, text(row[m.service]) || 'Unknown', text(row[m.outlet]) || 'Unknown', m.pax >= 0 ? num(row[m.pax]) : 0, this.o.batch])
    s.kept++
  }
  finish() {
    this.s.lines = this.lines.length
    this.s.orders = new Set(this.lines.map((l) => l[0])).size
    return { lines: this.lines, stats: this.s }
  }
}
