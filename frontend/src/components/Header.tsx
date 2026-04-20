import { NavLink } from 'react-router-dom'

const NAV = [
  { to: '/', label: 'Home', exact: true },
  { to: '/learn', label: 'Learn' },
  { to: '/quiz', label: 'Quiz' },
  { to: '/classify', label: 'Classify' },
  { to: '/stats', label: 'Stats' },
  { to: '/history', label: 'History' },
]

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <NavLink to="/" className="flex items-center gap-2 font-semibold text-red-600 text-sm shrink-0">
            <span className="bg-red-600 text-white rounded px-1.5 py-0.5 text-xs font-mono">TC</span>
            Traffic Classifier
          </NavLink>

          <nav className="flex items-center gap-0.5 flex-wrap justify-center">
            {NAV.map(({ to, label, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-red-50 text-red-600'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `p-2 rounded transition-colors ${isActive ? 'text-red-600 bg-red-50' : 'text-slate-400 hover:text-slate-700'}`
            }
            title="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </NavLink>
        </div>
      </div>
    </header>
  )
}
