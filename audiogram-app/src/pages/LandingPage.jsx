/**
 * LandingPage
 * - Explains what the app does
 * - Shows the mandatory disclaimer
 * - User must tick the checkbox before continuing to calibration
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../context/SessionContext'

export default function LandingPage() {
  const { setDisclaimerAccepted } = useSession()
  const [checked, setChecked] = useState(false)
  const navigate = useNavigate()

  function handleStart() {
    if (!checked) return
    setDisclaimerAccepted(true)
    navigate('/calibration')
  }

  return (
    <div className="flex flex-col items-center px-4 py-8 max-w-lg mx-auto">
      {/* Hero tagline — header bar already shows the app name */}
      <div className="mb-8 text-center">
        <p className="text-slate-500 text-sm">Test your hearing sensitivity across all frequencies<br/>and draw your personal audiogram 📊</p>
      </div>

      {/* What is this */}
      <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
        <h2 className="font-semibold text-slate-800 mb-3">What does this app do?</h2>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex gap-2"><span>🔊</span><span>Plays pure tones across frequencies from low to high</span></li>
          <li className="flex gap-2"><span>👂</span><span>Tests each ear separately via your headphones</span></li>
          <li className="flex gap-2"><span>📊</span><span>Draws your personal audiogram chart</span></li>
          <li className="flex gap-2"><span>📄</span><span>Lets you export a PDF to share with a professional</span></li>
        </ul>
      </div>

      {/* What you need */}
      <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
        <h2 className="font-semibold text-slate-800 mb-3">Before you start</h2>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex gap-2"><span>🎧</span><span>Wear <strong>headphones or earbuds</strong> — speakers will not work</span></li>
          <li className="flex gap-2"><span>🤫</span><span>Find a <strong>quiet environment</strong></span></li>
          <li className="flex gap-2"><span>🔉</span><span>You will set your volume during the calibration step — do not change it after that</span></li>
        </ul>
      </div>

      {/* Disclaimer */}
      <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6">
        <h2 className="font-semibold text-amber-800 mb-2">⚠️ Important disclaimer</h2>
        <p className="text-sm text-amber-700 leading-relaxed">
          This application is for <strong>informational, educational, and personal use only</strong>.
          It is <strong>not a medical device</strong> and does not produce clinically accurate results.
          Estimated dB HL values depend on your device hardware and may differ from professional measurements.
          <br /><br />
          If you have any concerns about your hearing, please consult a qualified <strong>audiologist or healthcare professional</strong>.
        </p>
      </div>

      {/* Acknowledgement */}
      <label className="flex items-start gap-3 cursor-pointer mb-8 w-full">
        <input
          type="checkbox"
          checked={checked}
          onChange={e => setChecked(e.target.checked)}
          className="mt-0.5 w-5 h-5 rounded accent-indigo-600 cursor-pointer flex-shrink-0"
        />
        <span className="text-sm text-slate-700">
          I understand this app is <strong>not a medical tool</strong> and I will seek professional advice for any real hearing concerns.
        </span>
      </label>

      <button
        onClick={handleStart}
        disabled={!checked}
        className="w-full py-4 rounded-2xl text-white font-semibold text-lg transition-all
          bg-indigo-600 hover:bg-indigo-700 active:scale-95
          disabled:bg-slate-300 disabled:cursor-not-allowed"
      >
        Start the test →
      </button>
    </div>
  )
}
