/**
 * SessionContext
 * Holds all in-memory test state for the current session:
 *  - disclaimer acknowledgement
 *  - calibration anchor (dBFS level the user confirmed as ~65 dB SPL)
 *  - test results per ear: { left: { 250: -30, 500: -25, ... }, right: {...} }
 *  - selected ear order, test mode, frequency list
 */

import { createContext, useContext, useState } from 'react'

export const DEFAULT_FREQUENCIES = [250, 500, 1000, 2000, 4000, 8000]

const SessionContext = createContext(null)

export function SessionProvider({ children }) {
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false)
  // calibrationDb: the dBFS value the user calibrated to (we fix it at -20 dBFS ≈ 65 dB SPL)
  const [calibrationDb, setCalibrationDb] = useState(-20)
  const [calibrationDone, setCalibrationDone] = useState(false)
  const [frequencies, setFrequencies] = useState(DEFAULT_FREQUENCIES)
  const [results, setResults] = useState({ left: {}, right: {} })
  const [testMode, setTestMode] = useState('auto') // 'auto' | 'manual'
  const [userName, setUserName] = useState('')

  function recordThreshold(ear, frequency, dbFs) {
    setResults(prev => {
      const earResults = { ...prev[ear] }
      if (dbFs === undefined) {
        // Clear threshold (used when re-testing a frequency)
        delete earResults[frequency]
      } else {
        earResults[frequency] = dbFs
      }
      return { ...prev, [ear]: earResults }
    })
  }

  // Full reset — clears calibration too (use for "retake my test")
  function resetSession() {
    setResults({ left: {}, right: {} })
    setCalibrationDone(false)
  }

  // Partial reset — keeps calibration anchor (use for "test another person")
  // Both people will be measured on the same physical dB scale.
  function resetResultsOnly() {
    setResults({ left: {}, right: {} })
    setUserName('')
  }

  /**
   * Convert a raw dBFS threshold to estimated dB HL.
   * Formula: dB HL ≈ (calibrationDb − thresholdDb) + 65
   * where calibrationDb = level user said was "comfortable" (≈ 65 dB SPL)
   * and thresholdDb = lowest level heard at that frequency.
   *
   * Lower (more negative) thresholdDb = user hears quieter sounds = better hearing = lower dB HL.
   * Higher (less negative) thresholdDb = user needs louder sounds = worse hearing = higher dB HL.
   *
   * Formula:  dB HL ≈ 65 + (thresholdDb − calibrationDb)
   *   - If threshold == calibration anchor (-20 dBFS): dB HL = 65 (moderate, as expected for "speech level")
   *   - If threshold << calibration (e.g. -60 dBFS): dB HL = 65 + (-60 − -20) = 25 (normal) ✓
   *   - If threshold > calibration (e.g. -5 dBFS):  dB HL = 65 + (-5 − -20) = 80 (severe) ✓
   */
  function toDbHL(thresholdDb) {
    if (thresholdDb === null) return null   // NR — not heard at max level
    return Math.round(65 + (thresholdDb - calibrationDb))
  }

  return (
    <SessionContext.Provider value={{
      disclaimerAccepted, setDisclaimerAccepted,
      calibrationDb, setCalibrationDb,
      calibrationDone, setCalibrationDone,
      frequencies, setFrequencies,
      results, recordThreshold,
      testMode, setTestMode,
      userName, setUserName,
      resetSession, resetResultsOnly, toDbHL,
    }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside SessionProvider')
  return ctx
}
