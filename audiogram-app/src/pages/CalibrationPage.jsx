/**
 * CalibrationPage
 * Plays a 1 kHz reference tone at a fixed dBFS level (-20 dBFS ≈ comfortable listening).
 * User adjusts device volume until the tone sounds like normal conversation, then confirms.
 * The confirmed dBFS level is stored as the calibration anchor in session context.
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { playTone, resumeAudio } from '../audio/audioEngine'
import { useSession } from '../context/SessionContext'

const CALIBRATION_DB = -20   // dBFS anchor — maps to ~65 dB SPL in comfortable listening

export default function CalibrationPage() {
  const { setCalibrationDb, setCalibrationDone, disclaimerAccepted } = useSession()
  const navigate = useNavigate()
  const [playing, setPlaying] = useState(false)
  const activeRef      = useRef(false)   // controls the loop
  const stopToneRef    = useRef(null)    // stops the currently playing oscillator

  // Guard: redirect to home if disclaimer not accepted
  useEffect(() => {
    if (!disclaimerAccepted) navigate('/')
  }, [disclaimerAccepted, navigate])

  // Cleanup on unmount — stop everything if user navigates away
  useEffect(() => {
    return () => {
      activeRef.current = false
      stopToneRef.current?.()
    }
  }, [])

  function stopAll() {
    activeRef.current = false
    stopToneRef.current?.()
    stopToneRef.current = null
  }

  function toggleTone() {
    resumeAudio()
    if (playing) {
      stopAll()
      setPlaying(false)
    } else {
      activeRef.current = true
      setPlaying(true)

      function playLoop() {
        if (!activeRef.current) return
        // Play same tone on both channels via panning
        stopToneRef.current = playTone(1000, CALIBRATION_DB, 'left',  2000)
        playTone(1000, CALIBRATION_DB, 'right', 2000)
        setTimeout(() => { if (activeRef.current) playLoop() }, 2300)
      }
      playLoop()
    }
  }

  function handleConfirm() {
    stopAll()
    setCalibrationDb(CALIBRATION_DB)
    setCalibrationDone(true)
    navigate('/setup')
  }

  return (
    <div className="flex flex-col items-center px-4 py-8 max-w-lg mx-auto">
      <div className="w-full flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/')} className="text-sm text-slate-400 hover:text-slate-600">← Back</button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 leading-tight">Step 1 — Volume calibration</h1>
          <p className="text-xs text-slate-400">Set a reference volume before the test.</p>
        </div>
      </div>

      <div className="w-full bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6 space-y-4 text-sm text-slate-700">
        <p className="font-medium text-slate-800">Follow these steps:</p>
        <ol className="list-decimal list-inside space-y-3 leading-relaxed">
          <li>Put on your <strong>headphones or earbuds</strong>.</li>
          <li>Press <strong>Play reference tone</strong> below.</li>
          <li>Adjust your <strong>device volume</strong> until the tone sounds like a normal conversation — <em>present and clear, but not loud</em>.</li>
          <li>When the volume feels right, press <strong>Sounds right — continue</strong>.</li>
        </ol>
        <p className="text-amber-700 bg-amber-50 rounded-lg p-3">
          ⚠️ <strong>Do not change your volume</strong> after this step.
          Results depend on keeping the same volume throughout the test.
        </p>
      </div>

      {/* Play button */}
      <button
        onClick={toggleTone}
        className={`w-full py-5 rounded-2xl font-semibold text-lg mb-4 transition-all active:scale-95
          ${playing
            ? 'bg-red-100 text-red-700 border-2 border-red-300'
            : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
      >
        {playing ? '⏹ Stop tone' : '▶ Play reference tone (1 kHz)'}
      </button>

      {/* Confirm button */}
      <button
        onClick={handleConfirm}
        disabled={!playing}
        className="w-full py-4 rounded-2xl text-white font-semibold text-base transition-all
          bg-emerald-600 hover:bg-emerald-700 active:scale-95
          disabled:bg-slate-300 disabled:cursor-not-allowed"
      >
        ✓ Sounds right — continue
      </button>

      <p className="mt-4 text-xs text-slate-400 text-center">
        The reference tone plays on both ears at the same level.
      </p>
    </div>
  )
}
