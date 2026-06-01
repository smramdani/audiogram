/**
 * HistoryPage
 * Shows all saved tests in the session.
 * Features:
 *  - List with date, name, summary dB HL values
 *  - Inline rename
 *  - Delete individual test
 *  - Multi-select → comparison chart
 *  - Print single test or all selected as PDF
 *  - Reset all tests
 */

import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { useSession } from '../context/SessionContext'
import AudiogramChart from '../components/AudiogramChart'
import ComparisonChart, { PALETTE } from '../components/ComparisonChart'
import { formatFreq } from '../utils/formatFreq'

function classifyHL(v) {
  if (v === null) return { label: 'NR', color: 'text-slate-400' }
  if (v <= 25)  return { label: 'Normal',    color: 'text-emerald-600' }
  if (v <= 40)  return { label: 'Mild',      color: 'text-yellow-600'  }
  if (v <= 55)  return { label: 'Moderate',  color: 'text-orange-500'  }
  if (v <= 70)  return { label: 'Mod-sev',   color: 'text-red-500'     }
  return              { label: 'Severe',     color: 'text-red-700'     }
}

function TestCard({ entry, color, selected, onToggle, onDelete, onRename, onPrint }) {
  const [editing, setEditing]  = useState(false)
  const [nameVal, setNameVal]  = useState(entry.name)
  const [confirm, setConfirm]  = useState(false)
  const inputRef               = useRef(null)

  function submitRename() {
    onRename(entry.id, nameVal)
    setEditing(false)
  }

  // Summary: first 4 frequencies of left ear
  const leftVals  = entry.frequencies.slice(0, 6).map(f => {
    const raw = entry.results.left?.[f]
    if (raw === undefined) return null
    if (raw === null) return 'NR'
    return Math.round(65 + (raw - entry.calibrationDb))
  })
  const date = new Date(entry.date)
  const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className={`w-full rounded-2xl border-2 transition-all ${selected ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white'}`}>
      {/* Top row */}
      <div className="flex items-center gap-3 p-3">
        {/* Select checkbox */}
        <button
          onClick={onToggle}
          className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors
            ${selected ? 'border-indigo-500' : 'border-slate-300'}`}
          style={selected ? { background: color, borderColor: color } : {}}
          aria-label="Select for comparison"
        >
          {selected && <span className="text-white text-xs font-bold">✓</span>}
        </button>

        {/* Name / rename */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={nameVal}
                onChange={e => setNameVal(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitRename()}
                autoFocus
                maxLength={40}
                className="flex-1 px-2 py-1 text-sm border-2 border-indigo-400 rounded-lg focus:outline-none"
              />
              <button onClick={submitRename} className="text-xs font-semibold text-indigo-600 px-2">Save</button>
              <button onClick={() => { setNameVal(entry.name); setEditing(false) }} className="text-xs text-slate-400 px-1">✕</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800 text-sm truncate">{entry.name}</span>
              <button onClick={() => setEditing(true)} className="text-slate-300 hover:text-slate-500 flex-shrink-0" title="Rename">✏</button>
            </div>
          )}
          <p className="text-xs text-slate-400 mt-0.5">{dateStr}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={onPrint}
            title="Export PDF"
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-indigo-100 flex items-center justify-center text-sm transition-colors"
          >📄</button>

          {confirm ? (
            <div className="flex gap-1">
              <button onClick={() => onDelete(entry.id)} className="text-xs font-semibold text-red-600 px-1.5 py-1 rounded-lg bg-red-50 hover:bg-red-100">Delete?</button>
              <button onClick={() => setConfirm(false)} className="text-xs text-slate-400 px-1">✕</button>
            </div>
          ) : (
            <button
              onClick={() => setConfirm(true)}
              title="Delete"
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-red-100 flex items-center justify-center text-sm transition-colors"
            >🗑</button>
          )}
        </div>
      </div>

      {/* Threshold summary */}
      <div className="px-3 pb-3">
        <div className="flex flex-wrap gap-x-2 gap-y-0.5">
          {entry.frequencies.slice(0, 6).map((f, i) => {
            const v = leftVals[i]
            const cls = v !== null ? classifyHL(v) : null
            return (
              <span key={f} className="text-xs text-slate-400">
                {formatFreq(f, { short: true })}: <span className={`font-medium ${cls?.color || 'text-slate-300'}`}>{v ?? '—'}</span>
              </span>
            )
          })}
          <span className="text-xs text-slate-300 ml-1">(L ear, est. dB HL)</span>
        </div>
      </div>
    </div>
  )
}

export default function HistoryPage() {
  const { testHistory, deleteTest, renameTest, clearAllTests, entryData, loadDemoData } = useSession()
  // Expose demo loader for preview testing
  if (typeof window !== 'undefined') window.__loadDemo = loadDemoData
  const navigate         = useNavigate()
  const [selected, setSelected]     = useState(new Set())
  const [confirmReset, setConfirmReset] = useState(false)
  const compChartRef                = useRef(null)
  const singleChartRefs             = useRef({})

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleReset() {
    clearAllTests()
    setSelected(new Set())
    setConfirmReset(false)
  }

  // ── Comparison datasets ────────────────────────────────────────────────────
  const selectedEntries = testHistory.filter(t => selected.has(t.id))
  const compDatasets    = selectedEntries.map(entry => {
    const { left, right } = entryData(entry)
    return { id: entry.id, name: entry.name, leftData: left, rightData: right }
  })

  // ── PDF export for a single entry ──────────────────────────────────────────
  async function printSingle(entry) {
    const ref = singleChartRefs.current[entry.id]
    if (!ref) return

    const canvas  = await html2canvas(ref, { scale: 2, backgroundColor: '#ffffff' })
    const imgData = canvas.toDataURL('image/png')
    const pdf     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW   = pdf.internal.pageSize.getWidth()
    const margin  = 15
    const contentW = pageW - margin * 2
    let y = margin

    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(18); pdf.setTextColor(0)
    pdf.text('Audiogram', margin, y); y += 8
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13); pdf.setTextColor(30)
    pdf.text(entry.name, margin, y); y += 6
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10); pdf.setTextColor(100)
    pdf.text(`Test date: ${new Date(entry.date).toLocaleString()}`, margin, y); y += 10

    const imgH = (canvas.height / canvas.width) * contentW
    pdf.addImage(imgData, 'PNG', margin, y, contentW, imgH); y += imgH + 8

    // Table
    const { left, right } = entryData(entry)
    pdf.setFontSize(9); pdf.setTextColor(0)
    const colW = contentW / (entry.frequencies.length + 1)
    pdf.setFillColor(241, 245, 249)
    pdf.rect(margin, y, contentW, 6, 'F')
    pdf.text('Ear', margin + 2, y + 4)
    entry.frequencies.forEach((f, i) => pdf.text(formatFreq(f, { short: true }), margin + colW * (i + 1), y + 4))
    y += 7
    ;[['Left', left], ['Right', right]].forEach(([lbl, data]) => {
      pdf.text(lbl, margin + 2, y + 4)
      entry.frequencies.forEach((f, i) => {
        const d = data.find(d => d.frequency === f)
        pdf.text(!d ? '—' : d.dbHL === null ? 'NR' : String(d.dbHL), margin + colW * (i + 1), y + 4)
      })
      y += 7
    })
    y += 6

    const DISCLAIMER = 'This application is for informational, educational, and personal use only. It is not a medical device and does not produce clinically accurate results. If you have any concerns about your hearing, please consult a qualified audiologist or healthcare professional.'
    pdf.setFontSize(8); pdf.setTextColor(130); pdf.setFont('helvetica', 'italic')
    pdf.text(pdf.splitTextToSize(`⚠ ${DISCLAIMER}`, contentW), margin, y)

    const safeName = entry.name.replace(/[^a-z0-9]/gi, '_').slice(0, 30)
    pdf.save(`audiogram_${safeName}_${new Date(entry.date).toISOString().slice(0, 10)}.pdf`)
  }

  // ── PDF export for comparison ──────────────────────────────────────────────
  async function printComparison() {
    if (!compChartRef.current) return
    const canvas  = await html2canvas(compChartRef.current, { scale: 2, backgroundColor: '#ffffff' })
    const imgData = canvas.toDataURL('image/png')
    const pdf     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW   = pdf.internal.pageSize.getWidth()
    const margin  = 15
    const contentW = pageW - margin * 2
    let y = margin

    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(16); pdf.setTextColor(0)
    pdf.text('Audiogram — Comparison', margin, y); y += 8
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10); pdf.setTextColor(100)
    pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, y); y += 6
    pdf.text(`Participants: ${selectedEntries.map(e => e.name).join(', ')}`, margin, y); y += 10

    const imgH = (canvas.height / canvas.width) * contentW
    pdf.addImage(imgData, 'PNG', margin, y, contentW, imgH); y += imgH + 10

    // Per-participant threshold tables
    selectedEntries.forEach((entry, idx) => {
      if (y > 240) { pdf.addPage(); y = 15 }
      const { left, right } = entryData(entry)
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); pdf.setTextColor(0)
      pdf.text(`${entry.name} — ${new Date(entry.date).toLocaleString()}`, margin, y); y += 6
      const colW = contentW / (entry.frequencies.length + 1)
      pdf.setFontSize(9); pdf.setFont('helvetica', 'normal')
      pdf.setFillColor(241, 245, 249)
      pdf.rect(margin, y, contentW, 6, 'F')
      pdf.text('Ear', margin + 2, y + 4)
      entry.frequencies.forEach((f, i) => pdf.text(formatFreq(f, { short: true }), margin + colW * (i + 1), y + 4))
      y += 7
      ;[['Left', left], ['Right', right]].forEach(([lbl, data]) => {
        pdf.text(lbl, margin + 2, y + 4)
        entry.frequencies.forEach((f, i) => {
          const d = data.find(d => d.frequency === f)
          pdf.text(!d ? '—' : d.dbHL === null ? 'NR' : String(d.dbHL), margin + colW * (i + 1), y + 4)
        })
        y += 7
      })
      y += 4
    })

    pdf.save(`audiogram_comparison_${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  const isEmpty = testHistory.length === 0

  return (
    <div className="flex flex-col items-center px-4 py-6 max-w-lg mx-auto min-h-screen">

      {/* Page header */}
      <div className="w-full flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Test history</h1>
          <p className="text-xs text-slate-400">
            {testHistory.length === 0 ? 'No tests saved yet' : `${testHistory.length} test${testHistory.length > 1 ? 's' : ''} saved`}
          </p>
        </div>
        <button
          onClick={() => navigate('/setup')}
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 active:scale-95 transition-all"
        >
          + New test
        </button>
      </div>

      {/* Empty state */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center flex-1 text-center py-16">
          <span className="text-5xl mb-4">📋</span>
          <p className="text-slate-500 mb-2">No tests saved yet.</p>
          <p className="text-sm text-slate-400 mb-6">Complete a test and save it to compare results.</p>
          <button
            onClick={() => navigate('/setup')}
            className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-semibold hover:bg-indigo-700"
          >
            Start a test
          </button>
        </div>
      )}

      {/* Test list */}
      {!isEmpty && (
        <>
          {/* Selection hint */}
          {selected.size === 0 && (
            <p className="w-full text-xs text-slate-400 mb-3">
              💡 Tap the circle to select tests and compare them
            </p>
          )}

          <div className="w-full space-y-3 mb-6">
            {testHistory.map((entry, i) => (
              <div key={entry.id}>
                {/* Visible card */}
                <TestCard
                  entry={entry}
                  color={PALETTE[i % PALETTE.length]}
                  selected={selected.has(entry.id)}
                  onToggle={() => toggleSelect(entry.id)}
                  onDelete={deleteTest}
                  onRename={renameTest}
                  onPrint={() => printSingle(entry)}
                />
                {/* Off-screen chart for single-test PDF capture */}
                <div
                  ref={el => { if (el) singleChartRefs.current[entry.id] = el }}
                  className="bg-white p-3"
                  style={{ position: 'absolute', left: '-9999px', top: 0, width: '700px' }}
                  aria-hidden="true"
                >
                  <AudiogramChart
                    leftData={entryData(entry).left}
                    rightData={entryData(entry).right}
                    forPDF
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Comparison chart */}
          {selected.size >= 2 && (
            <div className="w-full mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-700">
                  Comparing {selected.size} tests
                </h2>
                <button
                  onClick={printComparison}
                  className="text-xs font-medium text-indigo-600 flex items-center gap-1 hover:text-indigo-800"
                >
                  📄 Export comparison PDF
                </button>
              </div>
              {/* Visible comparison chart */}
              <div className="w-full bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <ComparisonChart datasets={compDatasets} />
              </div>
              {/* Off-screen for PDF */}
              <div
                ref={compChartRef}
                className="bg-white p-4"
                style={{ position: 'absolute', left: '-9999px', top: 0, width: '700px' }}
                aria-hidden="true"
              >
                <ComparisonChart datasets={compDatasets} forPDF />
              </div>
            </div>
          )}

          {/* Bottom actions */}
          <div className="w-full pt-4 border-t border-slate-100 space-y-3">
            {selected.size >= 2 && (
              <button
                onClick={printComparison}
                className="w-full py-3 rounded-2xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 active:scale-95 transition-all"
              >
                📄 Export comparison PDF ({selected.size} tests)
              </button>
            )}

            {confirmReset ? (
              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="flex-1 py-3 rounded-2xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700"
                >
                  Yes, delete all {testHistory.length} tests
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="flex-1 py-3 rounded-2xl bg-white border border-slate-200 text-slate-600 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmReset(true)}
                className="w-full py-3 rounded-2xl bg-white border border-red-200 text-red-500 font-medium text-sm hover:bg-red-50 active:scale-95 transition-all"
              >
                🗑 Reset all tests
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
