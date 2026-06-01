/**
 * SessionContext
 * In-memory session state — no backend.
 * Holds current test + full test history for the session.
 */

import { createContext, useContext, useState } from 'react'

export const DEFAULT_FREQUENCIES = [250, 500, 1000, 2000, 4000, 8000]

const SessionContext = createContext(null)

export function SessionProvider({ children }) {
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false)
  const [calibrationDb, setCalibrationDb] = useState(-20)
  const [calibrationDone, setCalibrationDone] = useState(false)
  const [frequencies, setFrequencies] = useState(DEFAULT_FREQUENCIES)
  const [results, setResults] = useState({ left: {}, right: {} })
  const [testMode, setTestMode] = useState('auto')
  const [userName, setUserName] = useState('')

  // ── Test history ──────────────────────────────────────────────────────────────
  // Each entry: { id, name, date, frequencies, results, calibrationDb }
  const [testHistory, setTestHistory] = useState([])

  function recordThreshold(ear, frequency, dbFs) {
    setResults(prev => {
      const earResults = { ...prev[ear] }
      if (dbFs === undefined) {
        delete earResults[frequency]
      } else {
        earResults[frequency] = dbFs
      }
      return { ...prev, [ear]: earResults }
    })
  }

  function resetSession() {
    setResults({ left: {}, right: {} })
    setCalibrationDone(false)
    setUserName('')
  }

  function resetResultsOnly() {
    setResults({ left: {}, right: {} })
    setUserName('')
  }

  // Save the current test into history and return the new entry id
  function saveCurrentTest() {
    const hasData =
      Object.keys(results.left  || {}).length > 0 ||
      Object.keys(results.right || {}).length > 0
    if (!hasData) return null

    const entry = {
      id:           `${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name:         userName.trim() || 'Anonymous',
      date:         new Date().toISOString(),
      frequencies:  [...frequencies],
      results:      JSON.parse(JSON.stringify(results)),
      calibrationDb,
    }
    setTestHistory(prev => [...prev, entry])
    return entry.id
  }

  function deleteTest(id) {
    setTestHistory(prev => prev.filter(t => t.id !== id))
  }

  function renameTest(id, newName) {
    setTestHistory(prev =>
      prev.map(t => t.id === id ? { ...t, name: newName.trim() || t.name } : t)
    )
  }

  function clearAllTests() {
    setTestHistory([])
  }

  // Populate history with realistic demo entries for preview/demo purposes
  function loadDemoData() {
    const now = Date.now()
    const freqs = [250, 500, 1000, 2000, 4000, 8000]
    setTestHistory([
      { id: `${now}-a`, name: 'Hammed', date: new Date(now - 7200000).toISOString(), frequencies: freqs, calibrationDb: -20,
        results: { left: {250:-55,500:-58,1000:-60,2000:-50,4000:-42,8000:-35}, right: {250:-52,500:-55,1000:-58,2000:-48,4000:-40,8000:-32} } },
      { id: `${now}-b`, name: 'Marie Dupont', date: new Date(now - 3600000).toISOString(), frequencies: freqs, calibrationDb: -20,
        results: { left: {250:-45,500:-48,1000:-50,2000:-42,4000:-35,8000:-28}, right: {250:-42,500:-45,1000:-48,2000:-40,4000:-32,8000:-25} } },
      { id: `${now}-c`, name: 'Jean-Pierre', date: new Date(now - 1800000).toISOString(), frequencies: freqs, calibrationDb: -20,
        results: { left: {250:-38,500:-40,1000:-42,2000:-35,4000:-28,8000: null}, right: {250:-35,500:-38,1000:-40,2000:-33,4000:-25,8000: null} } },
    ])
  }

  // dBFS → dB HL conversion for the CURRENT test
  function toDbHL(thresholdDb) {
    if (thresholdDb === null) return null
    return Math.round(65 + (thresholdDb - calibrationDb))
  }

  // dBFS → dB HL conversion for a HISTORY entry (uses that entry's calibrationDb)
  function entryToDbHL(entry, thresholdDb) {
    if (thresholdDb === null) return null
    return Math.round(65 + (thresholdDb - entry.calibrationDb))
  }

  // Resolve a history entry's results into { frequency, dbHL } arrays
  function entryData(entry) {
    const left  = Object.entries(entry.results.left  || {})
      .map(([f, db]) => ({ frequency: Number(f), dbHL: entryToDbHL(entry, db) }))
      .sort((a, b) => a.frequency - b.frequency)
    const right = Object.entries(entry.results.right || {})
      .map(([f, db]) => ({ frequency: Number(f), dbHL: entryToDbHL(entry, db) }))
      .sort((a, b) => a.frequency - b.frequency)
    return { left, right }
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
      testHistory, saveCurrentTest, deleteTest, renameTest, clearAllTests, entryData, loadDemoData,
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
