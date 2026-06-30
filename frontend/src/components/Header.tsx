import { useState } from 'react'
import { NavLink } from 'react-router-dom'

const NAV = [
  { to: '/', label: 'Home', exact: true },
  { to: '/learn', label: 'Learn' },
  { to: '/quiz', label: 'Quiz' },
  { to: '/classify', label: 'Classify' },
  { to: '/stats', label: 'Stats' },
  { to: '/monitor', label: 'Monitor' },
  { to: '/evaluate', label: 'Evaluate' },
  { to: '/history', label: 'History' },
  { to: '/settings', label: 'Settings' },
]

export default function Header() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  const linkCls = (isActive: boolean) =>
    `px-3 py-1.5 rounded text-sm font-medium transition-colors ${
      isActive
        ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
    }`

  const mobileLinkCls = (isActive: boolean) =>
    `block px-4 py-3 text-sm font-medium border-b border-slate-100 dark:border-slate-700 transition-colors ${
      isActive
        ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
    }`

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2 font-semibold text-red-600 text-sm shrink-0" onClick={close}>
            <span className="bg-red-600 text-white rounded px-1.5 py-0.5 text-xs font-mono">TC</span>
            Traffic Classifier
          </NavLink>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {NAV.filter(n => n.to !== '/settings').map(({ to, label, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                className={({ isActive }) => linkCls(isActive)}
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Desktop settings icon + mobile hamburger */}
          <div className="flex items-center gap-1">
            {/* Settings icon — desktop only */}
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `hidden md:block p-2 rounded transition-colors ${isActive ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30' : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`
              }
              title="Settings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </NavLink>

            {/* Hamburger — mobile only */}
            <button
              onClick={() => setOpen(v => !v)}
              className="md:hidden p-2 rounded text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle menu"
              aria-expanded={open}
            >
              {open ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          {NAV.map(({ to, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              onClick={close}
              className={({ isActive }) => mobileLinkCls(isActive)}
            >
              {label}
            </NavLink>
          ))}
        </div>
      )}
    </header>
  )
}
