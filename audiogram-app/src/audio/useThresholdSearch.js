/**
 * useThresholdSearch.js
 * Implements a simplified Hughson-Westlake threshold-search algorithm.
 *
 * Rules:
 *  - Start at startDb (default −10 dBFS, i.e. clearly audible after calibration)
 *  - Step DOWN 10 dB each time the user hears the tone
 *  - Step UP 5 dB each time the user misses it
 *  - Threshold = lowest dB heard on ≥ 2 of 3 ascending trials at the same level
 *
 * The hook drives one frequency at a time.
 * Call `respond(heard: boolean)` after each tone presentation.
 * `threshold` is set (non-null) when the algorithm converges.
 */

import { useCallback, useRef, useState } from 'react'
import { playTone } from './audioEngine'

const STEP_DOWN = 10
const STEP_UP = 5
const REQUIRED_HITS = 2  // hits needed at the same level to confirm threshold
const TONE_DURATION_MS = 1000

export function useThresholdSearch({ frequency, ear, startDb = -10, onThresholdFound }) {
  const [currentDb, setCurrentDb] = useState(startDb)
  const [status, setStatus] = useState('idle') // idle | playing | waiting | done
  const [threshold, setThreshold] = useState(null)

  // Tracking ascending trials at each level
  const ascendingHits = useRef({})   // { db: hitCount }
  const ascendingTrials = useRef({}) // { db: trialCount }
  const lastDirection = useRef('down')
  const currentDbRef = useRef(startDb)
  const stopToneRef = useRef(null)

  const updateDb = useCallback((newDb) => {
    currentDbRef.current = newDb
    setCurrentDb(newDb)
  }, [])

  const playCurrentTone = useCallback(() => {
    if (stopToneRef.current) stopToneRef.current()
    setStatus('playing')
    stopToneRef.current = playTone(frequency, currentDbRef.current, ear, TONE_DURATION_MS)
    setTimeout(() => setStatus('waiting'), TONE_DURATION_MS + 100)
  }, [frequency, ear])

  const start = useCallback(() => {
    ascendingHits.current = {}
    ascendingTrials.current = {}
    lastDirection.current = 'down'
    currentDbRef.current = startDb
    setCurrentDb(startDb)
    setThreshold(null)
    setStatus('idle')
    // small delay so UI is ready, then play
    setTimeout(playCurrentTone, 300)
  }, [startDb, playCurrentTone])

  const respond = useCallback((heard) => {
    if (status !== 'waiting') return
    const db = currentDbRef.current

    if (heard) {
      // Track ascending hits (only count when coming from below)
      if (lastDirection.current === 'up') {
        ascendingHits.current[db] = (ascendingHits.current[db] || 0) + 1
        ascendingTrials.current[db] = (ascendingTrials.current[db] || 0) + 1
      }
      lastDirection.current = 'down'

      // Check for threshold convergence
      if ((ascendingHits.current[db] || 0) >= REQUIRED_HITS) {
        setThreshold(db)
        setStatus('done')
        onThresholdFound && onThresholdFound(db)
        return
      }

      updateDb(db - STEP_DOWN)
    } else {
      lastDirection.current = 'up'
      if (ascendingTrials.current[db] !== undefined) {
        ascendingTrials.current[db] = (ascendingTrials.current[db] || 0) + 1
      }
      updateDb(db + STEP_UP)
    }

    setTimeout(playCurrentTone, 500)
  }, [status, playCurrentTone, updateDb, onThresholdFound])

  return { status, currentDb, threshold, start, respond, playCurrentTone }
}
