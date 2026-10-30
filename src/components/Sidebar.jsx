import { APP_NAME, logoUrl } from '../config.js'

export default function Sidebar({ steps, tab, onTab, summary }) {
  return (
    <aside className="sidebar">
      <div className="brand px-5 pt-6 pb-6 flex items-center gap-3">
        <img src={logoUrl()} alt="" className="w-10 h-10 shrink-0 bg-white p-1 object-contain" />
        <div className="brandtext min-w-0">
          <div className="text-lg font-semibold leading-tight">{APP_NAME}</div>
          <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,.7)' }}>Marketing team workspace</div>
        </div>
      </div>
      <nav className="nav" role="tablist">
        {steps.map((s, i) => <button key={s} role="tab" aria-selected={tab === i} className="navbtn" onClick={() => onTab(i)}>{s}</button>)}
      </nav>
      <div className="sfoot mt-auto px-5 py-5 text-xs mono" style={{ color: 'rgba(255,255,255,.7)' }}>{summary}</div>
    </aside>
  )
}
