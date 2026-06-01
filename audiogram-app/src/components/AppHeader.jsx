/**
 * AppHeader
 * Sticky top bar shown on every page.
 * Contains: logo mark, app name, tagline, and a subtle progress hint via the route.
 */

import { useLocation, useNavigate } from 'react-router-dom'
import { useSession } from '../context/SessionContext'

const STEPS = [
  { path: '/calibration', label: 'Calibrate' },
  { path: '/setup',       label: 'Settings'  },
  { path: '/test',        label: 'Test'      },
  { path: '/results',     label: 'Results'   },
]

export default function AppHeader() {
  const { pathname }   = useLocation()
  const navigate       = useNavigate()
  const { testHistory } = useSession()
  const stepIndex      = STEPS.findIndex(s => pathname.startsWith(s.path))
  const isHome         = pathname === '/'
  const isHistory      = pathname === '/history'

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-slate-100 shadow-sm">
      <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-3">

        {/* Logo + Name */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 group flex-shrink-0"
          aria-label="Go to home"
        >
          {/* Ear / waveform icon */}
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:bg-indigo-700 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              {/* Stylised sound-wave / ear mark */}
              <path d="M12 3C8.13 3 5 6.13 5 10c0 2.38 1.19 4.47 3 5.74V17a1 1 0 001 1h1v2a1 1 0 002 0v-2h1a1 1 0 001-1v-1.26C15.81 14.47 17 12.38 17 10c0-3.87-3.13-7-5-7z" fill="white" opacity="0.9"/>
              <circle cx="12" cy="10" r="2" fill="white" opacity="0.6"/>
            </svg>
          </div>

          <div className="text-left">
            <p className="text-base font-bold text-slate-900 leading-tight tracking-tight group-hover:text-indigo-700 transition-colors">
              Audiogram
            </p>
            <p className="text-[10px] text-slate-400 leading-none hidden sm:block">
              Your personal hearing test — for fun!
            </p>
          </div>
        </button>

        {/* Step breadcrumb (hidden on home) */}
        {!isHome && stepIndex >= 0 && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {STEPS.map((step, i) => {
              const isDone    = i < stepIndex
              const isActive  = i === stepIndex
              return (
                <div key={step.path} className="flex items-center">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-all
                    ${isActive
                      ? 'bg-indigo-100 text-indigo-700'
                      : isDone
                        ? 'text-emerald-600'
                        : 'text-slate-300'}`}
                  >
                    {isDone ? '✓' : step.label}
                  </span>
                  {i < STEPS.length - 1 && (
                    <span className="text-slate-200 text-xs mx-0.5">›</span>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* History icon — always visible when tests exist, except on history page itself */}
        {!isHistory && testHistory.length > 0 && (
          <button
            onClick={() => navigate('/history')}
            className="relative flex-shrink-0 w-9 h-9 rounded-xl bg-slate-100 hover:bg-indigo-100 flex items-center justify-center transition-colors"
            title="Test history"
          >
            <span className="text-base">📋</span>
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center">
              {testHistory.length}
            </span>
          </button>
        )}

        {/* Tagline on home (mobile) when no history */}
        {isHome && testHistory.length === 0 && (
          <p className="text-xs text-slate-400 text-right leading-snug sm:hidden">
            Your hearing<br/>test for fun!
          </p>
        )}
      </div>
    </header>
  )
}
