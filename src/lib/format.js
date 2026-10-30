export const fmt = (n) => Math.round(n).toLocaleString()
export const short = (n) => (n >= 1000000 ? +(n / 1000000).toFixed(1) + 'M' : n >= 1000 ? +(n / 1000).toFixed(1) + 'k' : '' + n)
export const niceMax = (m) => {
  if (!(m > 0)) return 1
  const p = Math.pow(10, Math.floor(Math.log10(m)))
  for (const s of [1, 2, 2.5, 5, 10]) if (s * p >= m) return s * p
  return 10 * p
}
export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const dayToISO = (d) => new Date(d * 86400000).toISOString().slice(0, 10)
export const isoToDay = (s) => Math.floor(Date.parse(s + 'T00:00:00Z') / 86400000)
