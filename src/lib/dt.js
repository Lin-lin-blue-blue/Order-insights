// Turns the many ways a date or time can appear in a CSV/Excel file into one number (ms, no time zone).
function parts(v) {
  if (v === null || v === undefined || v === '') return null
  if (v instanceof Date) {
    if (isNaN(v)) return null
    return { y: v.getFullYear(), mo: v.getMonth() + 1, d: v.getDate(), h: v.getHours(), mi: v.getMinutes(), s: v.getSeconds(), date: true, time: true }
  }
  if (typeof v === 'number') {
    if (v >= 1) {
      const dd = new Date(Math.round((v - 25569) * 86400000))
      return { y: dd.getUTCFullYear(), mo: dd.getUTCMonth() + 1, d: dd.getUTCDate(), h: dd.getUTCHours(), mi: dd.getUTCMinutes(), s: dd.getUTCSeconds(), date: true, time: v % 1 !== 0 }
    }
    const sec = Math.round(v * 86400)
    return { h: Math.floor(sec / 3600) % 24, mi: Math.floor(sec / 60) % 60, s: sec % 60, date: false, time: true }
  }
  const t = String(v).trim()
  if (!t) return null
  const out = { date: false, time: false }
  let m = t.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (m) { out.y = +m[1]; out.mo = +m[2]; out.d = +m[3]; out.date = true }
  else if ((m = t.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/))) { out.d = +m[1]; out.mo = +m[2]; out.y = +m[3]; out.date = true }
  const tm = t.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i)
  if (tm) {
    let h = +tm[1]
    const ap = tm[4] && tm[4].toUpperCase()
    if (ap === 'PM' && h < 12) h += 12
    if (ap === 'AM' && h === 12) h = 0
    out.h = h; out.mi = +tm[2]; out.s = tm[3] ? +tm[3] : 0; out.time = true
  }
  return out.date || out.time ? out : null
}

export function parseDateTime(dateVal, timeVal) {
  const a = parts(dateVal)
  if (!a || !a.date) return NaN
  const b = timeVal !== null && timeVal !== undefined && timeVal !== '' ? parts(timeVal) : null
  const t = b && b.time ? b : a.time ? a : { h: 0, mi: 0, s: 0 }
  return Date.UTC(a.y, a.mo - 1, a.d, t.h, t.mi, t.s)
}
