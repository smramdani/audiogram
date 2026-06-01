/**
 * TestPage
 * Supports two modes set in SetupPage:
 *
 *  AUTO   — app plays tones automatically, waits for response or timeout
 *  MANUAL — user presses "Play tone" each time, responds, can replay before advancing
 *
 * Algorithm: simplified Hughson-Westlake (down 10 / up 5 / 2 ascending hits)
 * Re-test:   tapping a completed frequency chip resets and re-tests that frequency
 *
 * All mutable algorithm state kept in refs to avoid stale-closure bugs.
 * Navigation deferred via useEffect watching a "finished" flag.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { playTone } from '../audio/audioEngine'
import { useSession } from '../context/SessionContext'
import { formatFreq } from '../utils/formatFreq'
import { NR } from '../data/referenceCurves'

const STEP_DOWN        = 10
const STEP_UP          = 5
const START_DB         = -10   // dBFS — clearly audible after calibration
const MIN_DB           = -100  // deeper floor: reach very quiet tones (maps to ~-15 dB HL)
const MAX_DB           = 0     // digital ceiling
const NR_MAX_MISSES    = 3     // consecutive misses at MAX_DB → mark as No Response
const TONE_DURATION    = 1000  // ms
const AUTO_TIMEOUT     = 4500  // ms — treat silence as not-heard in auto mode

const EAR_ORDER = ['left', 'right']

export default function TestPage() {
  const {
    calibrationDone, disclaimerAccepted,
    frequencies, recordThreshold, results, testMode,
  } = useSession()
  const navigate = useNavigate()

  // ── Outer progress ─────────────────────────────────────────────────────────
  const [earIdx,    setEarIdx]    = useState(0)
  const [freqIdx,   setFreqIdx]   = useState(0)
  const [tonePhase, setTonePhase] = useState('idle') // idle|playing|waiting|done

  // ── Algorithm refs ─────────────────────────────────────────────────────────
  const dbRef           = useRef(START_DB)
  const dirRef          = useRef('down')
  const hitsRef         = useRef({})
  const stopToneRef     = useRef(null)
  const autoTimerRef    = useRef(null)
  const respondingRef   = useRef(false)
  const maxMissesRef    = useRef(0)   // consecutive misses at MAX_DB → NR detection

  // ── Finish flag — defer navigate until after state propagates ───────────────
  const [finished, setFinished] = useState(false)
  useEffect(() => { if (finished) navigate('/results') }, [finished, navigate])

  // ── Guards ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!disclaimerAccepted || !calibrationDone) navigate('/')
  }, [disclaimerAccepted, calibrationDone, navigate])

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => () => {
    stopToneRef.current?.()
    clearTimeout(autoTimerRef.current)
  }, [])

  // ── Play a tone ────────────────────────────────────────────────────────────
  function playAt(db, ear, freq) {
    stopToneRef.current?.()
    clearTimeout(autoTimerRef.current)
    setTonePhase('playing')
    stopToneRef.current = playTone(freq, db, ear, TONE_DURATION)
    setTimeout(() => setTonePhase('waiting'), TONE_DURATION + 100)

    // Auto-timeout only in auto mode
    if (testMode === 'auto') {
      autoTimerRef.current = setTimeout(() => {
        respond(false, db, ear, freq)
      }, TONE_DURATION + AUTO_TIMEOUT)
    }
  }

  // ── Start a frequency ──────────────────────────────────────────────────────
  function startFreq(ear, freq, autoPlay = true) {
    dbRef.current         = START_DB
    dirRef.current        = 'down'
    hitsRef.current       = {}
    respondingRef.current = false
    maxMissesRef.current  = 0
    setTonePhase('idle')

    if (autoPlay) {
      setTimeout(() => playAt(START_DB, ear, freq), 400)
    }
  }

  // ── Advance to next frequency / ear / finish ───────────────────────────────
  function advanceFreq(ear, currentFreqIdx) {
    if (currentFreqIdx + 1 < frequencies.length) {
      const next = currentFreqIdx + 1
      setFreqIdx(next)
      startFreq(ear, frequencies[next], true)
    } else {
      const nextEarIdx = EAR_ORDER.indexOf(ear) + 1
      if (nextEarIdx < EAR_ORDER.length) {
        setEarIdx(nextEarIdx)
        setFreqIdx(0)
        startFreq(EAR_ORDER[nextEarIdx], frequencies[0], true)
      } else {
        setTonePhase('idle')
        setFinished(true)
      }
    }
  }

  // ── Respond to a tone ──────────────────────────────────────────────────────
  function respond(heard, dbOverride, earOverride, freqOverride) {
    clearTimeout(autoTimerRef.current)
    if (respondingRef.current) return
    respondingRef.current = true

    const db   = dbOverride   !== undefined ? dbOverride   : dbRef.current
    const ear  = earOverride  !== undefined ? earOverride  : EAR_ORDER[earIdx]
    const freq = freqOverride !== undefined ? freqOverride : frequencies[freqIdx]

    if (heard) {
      // A heard response resets the NR counter
      maxMissesRef.current = 0

      // Count ascending hit only when coming from below
      if (dirRef.current === 'up') {
        hitsRef.current[db] = (hitsRef.current[db] || 0) + 1
      }
      // Threshold converged (2 ascending hits) OR we've reached the floor
      if ((hitsRef.current[db] || 0) >= 2 || db <= MIN_DB) {
        recordThreshold(ear, freq, db)
        advanceFreq(ear, freqIdx)
        return
      }
      dirRef.current = 'down'
      dbRef.current  = db - STEP_DOWN
      respondingRef.current = false
      setTimeout(() => playAt(dbRef.current, ear, freq), 500)

    } else {
      // ── Not heard ─────────────────────────────────────────────────────────
      if (db >= MAX_DB) {
        maxMissesRef.current += 1
        // After NR_MAX_MISSES consecutive misses at the ceiling → No Response
        if (maxMissesRef.current >= NR_MAX_MISSES) {
          recordThreshold(ear, freq, NR)
          advanceFreq(ear, freqIdx)
          return
        }
      } else {
        maxMissesRef.current = 0  // reset if we're below the ceiling
      }

      dirRef.current = 'up'
      dbRef.current  = Math.min(db + STEP_UP, MAX_DB)
      respondingRef.current = false
      setTimeout(() => playAt(dbRef.current, ear, freq), 500)
    }
  }

  // ── Re-test a completed frequency ─────────────────────────────────────────
  function retestFreq(targetFreqIdx) {
    stopToneRef.current?.()
    clearTimeout(autoTimerRef.current)
    // Clear stored threshold so chip turns active
    recordThreshold(EAR_ORDER[earIdx], frequencies[targetFreqIdx], undefined)
    setFreqIdx(targetFreqIdx)
    startFreq(EAR_ORDER[earIdx], frequencies[targetFreqIdx], true)
  }

  // ── Boot: start on mount ───────────────────────────────────────────────────
  useEffect(() => {
    if (calibrationDone && disclaimerAccepted) {
      startFreq(EAR_ORDER[0], frequencies[0], true)
    }
  }, []) // eslint-disable-line

  // ── UI ─────────────────────────────────────────────────────────────────────
  const ear       = EAR_ORDER[earIdx]
  const frequency = frequencies[freqIdx]
  const isWaiting = tonePhase === 'waiting'
  const isPlaying = tonePhase === 'playing'
  const isIdle    = tonePhase === 'idle'

  // A frequency is "done" if it has an entry in results (value OR null=NR, but not undefined=not-yet-tested)
  const doneThisEar = Object.keys(results[ear] || {}).filter(k => results[ear][k] !== undefined || results[ear][k] === NR).length
  const totalDone   = earIdx * frequencies.length + doneThisEar
  const totalSteps  = EAR_ORDER.length * frequencies.length
  const progress    = Math.round((totalDone / totalSteps) * 100)

  // Manual mode: user taps Play
  function handleManualPlay() {
    if (isPlaying) return
    respondingRef.current = false
    playAt(dbRef.current, ear, frequency)
  }

  return (
    <div className="flex flex-col items-center min-h-screen px-4 py-10 max-w-lg mx-auto">

      {/* Progress */}
      <div className="w-full mb-6">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>{ear === 'left' ? 'Left ear 👂' : 'Right ear 👂'}</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div
            className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Frequency chips — tap a done one to re-test */}
      <div className="flex gap-2 mb-8 flex-wrap justify-center">
        {frequencies.map((f, i) => {
          const val      = results[ear]?.[f]
          const isNR     = f in (results[ear] || {}) && val === NR
          const isDone   = f in (results[ear] || {}) && (val !== undefined || isNR)
          const isActive = i === freqIdx && !isDone
          return (
            <button
              key={f}
              onClick={() => isDone ? retestFreq(i) : undefined}
              title={isDone ? (isNR ? 'Not heard — tap to re-test' : 'Tap to re-test') : undefined}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all
                ${isNR
                  ? 'bg-slate-200 text-slate-500 border-slate-300 hover:bg-slate-300 cursor-pointer active:scale-95'
                  : isDone
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200 cursor-pointer active:scale-95'
                    : isActive
                      ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                      : 'bg-white text-slate-400 border-slate-200 cursor-default'}`}
            >
              {formatFreq(f, { short: true })}
              {isNR  && <span className="ml-1 text-[10px] font-bold">NR</span>}
              {isDone && !isNR && <span className="ml-1 opacity-60 text-[10px]">↺</span>}
            </button>
          )
        })}
      </div>

      {/* Main card */}
      <div className="w-full bg-white rounded-3xl shadow-sm border border-slate-100 p-8 flex flex-col items-center mb-6">
        <p className="text-sm text-slate-400 mb-1">Current tone</p>
        <p className="text-4xl font-bold text-slate-900 mb-1">
          {formatFreq(frequency)}
        </p>
        <p className="text-xs text-slate-400 mb-6 capitalize">{ear} ear</p>

        {/* Status icon */}
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 transition-all duration-300
          ${isPlaying ? 'bg-indigo-100 scale-110' :
            isWaiting ? 'bg-indigo-50 animate-pulse' : 'bg-slate-100'}`}>
          <span className="text-4xl">
            {isPlaying ? '🔊' : isWaiting ? '👂' : '⏳'}
          </span>
        </div>

        <p className="text-sm text-slate-500 text-center mb-6 h-6">
          {isPlaying && 'Listen carefully…'}
          {isWaiting && 'Did you hear the tone?'}
          {isIdle    && (testMode === 'manual' ? 'Press Play to hear the tone' : 'Getting ready…')}
        </p>

        {/* ── MANUAL MODE controls ─────────────────────────────────────── */}
        {testMode === 'manual' && (
          <button
            onClick={handleManualPlay}
            disabled={isPlaying}
            className="w-full py-3 mb-4 rounded-2xl font-semibold text-base transition-all active:scale-95
              bg-indigo-600 text-white hover:bg-indigo-700
              disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            {isPlaying ? '🔊 Playing…' : '▶ Play tone'}
          </button>
        )}

        {/* ── Response buttons ─────────────────────────────────────────── */}
        <div className="flex gap-4 w-full">
          <button
            onClick={() => respond(true)}
            disabled={!isWaiting}
            className="flex-1 py-5 rounded-2xl font-bold text-lg transition-all active:scale-95
              bg-emerald-500 text-white hover:bg-emerald-600
              disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            ✓ I heard it
          </button>
          <button
            onClick={() => respond(false)}
            disabled={!isWaiting}
            className="flex-1 py-5 rounded-2xl font-bold text-lg transition-all active:scale-95
              bg-red-100 text-red-600 hover:bg-red-200 border border-red-200
              disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200"
          >
            ✗ Not heard
          </button>
        </div>
      </div>

      {/* Hint */}
      <p className="text-xs text-slate-400 text-center px-4">
        {testMode === 'auto'
          ? <>Tap <strong>"I heard it"</strong> as soon as you hear the tone. The test advances automatically if there is no response.</>
          : <>Press <strong>Play</strong> to hear the tone, then respond. Tap any green chip above to re-test that frequency.</>
        }
      </p>
    </div>
  )
}
