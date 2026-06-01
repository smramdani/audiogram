/**
 * SetupPage
 * Between calibration and the test.
 * Lets the user:
 *  - Choose test mode: Auto sweep | Manual step-by-step
 *  - Configure frequency range and step (octave / half-octave / extended)
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession, DEFAULT_FREQUENCIES } from '../context/SessionContext'
import { formatFreq } from '../utils/formatFreq'

const PRESETS = [
  {
    id: 'standard',
    label: 'Standard clinical',
    description: '6 frequencies — fastest (~5 min)',
    freqs: [250, 500, 1000, 2000, 4000, 8000],
  },
  {
    id: 'half-octave',
    label: 'Half-octave',
    description: '10 frequencies — more detail (~10 min)',
    freqs: [250, 500, 750, 1000, 1500, 2000, 3000, 4000, 6000, 8000],
  },
  {
    id: 'extended',
    label: 'Extended range',
    description: 'Includes 125 Hz & 12 kHz',
    freqs: [125, 250, 500, 1000, 2000, 4000, 8000, 12000],
  },
  {
    id: 'full-range',
    label: 'Full range',
    description: '16 frequencies, 20 Hz – 20 kHz — ISO ½-octave (~20 min)',
    // ISO 1/2-octave center frequencies (R4 series) — the complete human audible spectrum.
    // Each step multiplies by √2 ≈ 1.414 (one half-octave).
    // 20 Hz is the lowest audible frequency; 20 000 Hz is the highest.
    // Going beyond 20 kHz would enter ultrasound range — outside human hearing.
    freqs: [20, 32, 50, 80, 125, 200, 315, 500, 800, 1250, 2000, 3150, 5000, 8000, 12500, 20000],
  },
]

export default function SetupPage() {
  const { calibrationDone, disclaimerAccepted, setFrequencies, setTestMode, testMode, frequencies, userName, setUserName } = useSession()
  const navigate = useNavigate()

  // Find which preset matches current frequencies (or 'custom')
  const matchedPreset = PRESETS.find(p => JSON.stringify(p.freqs) === JSON.stringify(frequencies))
  const [selectedPreset, setSelectedPreset] = useState(matchedPreset?.id ?? 'standard')

  if (!disclaimerAccepted || !calibrationDone) {
    navigate('/')
    return null
  }

  function handleStart() {
    const preset = PRESETS.find(p => p.id === selectedPreset)
    if (preset) setFrequencies(preset.freqs)
    navigate('/test')
  }

  return (
    <div className="flex flex-col items-center px-4 py-8 max-w-lg mx-auto">
      <div className="w-full flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/calibration')} className="text-sm text-slate-400 hover:text-slate-600">← Back</button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 leading-tight">Step 2 — Test settings</h1>
          <p className="text-xs text-slate-400">Customise before you start</p>
        </div>
      </div>

      {/* ── Test mode ─────────────────────────────────────────────────────── */}
      <div className="w-full mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">Test mode</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              id: 'auto',
              icon: '▶',
              label: 'Auto sweep',
              desc: 'App steps through tones automatically. Tap when you hear them.',
            },
            {
              id: 'manual',
              icon: '🎛',
              label: 'Manual',
              desc: 'You control each tone. Play it as many times as you need.',
            },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setTestMode(m.id)}
              className={`rounded-2xl p-4 text-left border-2 transition-all
                ${testMode === m.id
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'}`}
            >
              <p className="text-2xl mb-1">{m.icon}</p>
              <p className={`font-semibold text-sm mb-1 ${testMode === m.id ? 'text-indigo-700' : 'text-slate-800'}`}>
                {m.label}
              </p>
              <p className="text-xs text-slate-500 leading-snug">{m.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Frequency preset ──────────────────────────────────────────────── */}
      <div className="w-full mb-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">Frequency range</h2>
        <div className="space-y-3">
          {PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPreset(p.id)}
              className={`w-full rounded-2xl p-4 text-left border-2 transition-all
                ${selectedPreset === p.id
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <p className={`font-semibold text-sm ${selectedPreset === p.id ? 'text-indigo-700' : 'text-slate-800'}`}>
                  {p.label}
                </p>
                <p className="text-xs text-slate-400">{p.description}</p>
              </div>
              {/* Frequency chips preview */}
              <div className="flex flex-wrap gap-1.5">
                {p.freqs.map(f => (
                  <span
                    key={f}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium
                      ${selectedPreset === p.id
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-slate-100 text-slate-500'}`}
                  >
                    {formatFreq(f, { short: true })}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Name ─────────────────────────────────────────────────────────── */}
      <div className="w-full mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">Your name</h2>
        <input
          type="text"
          value={userName}
          onChange={e => setUserName(e.target.value)}
          placeholder="Optional — shown on your results and PDF"
          maxLength={60}
          className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 bg-white text-slate-800
            placeholder:text-slate-400 text-sm focus:outline-none focus:border-indigo-400 transition-colors"
        />
      </div>

      <button
        onClick={handleStart}
        className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-semibold text-lg hover:bg-indigo-700 active:scale-95 transition-all"
      >
        Start test →
      </button>
    </div>
  )
}
