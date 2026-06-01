/**
 * ResultsPage
 * Shows the audiogram chart, threshold table, and PDF export button.
 * Redirects home if no results exist.
 */

import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import AudiogramChart from '../components/AudiogramChart'
import { useSession } from '../context/SessionContext'
import { formatFreq } from '../utils/formatFreq'

const DISCLAIMER =
  'This application is for informational, educational, and personal use only. ' +
  'It is not a medical device and does not produce clinically accurate results. ' +
  'If you have any concerns about your hearing, please consult a qualified audiologist or healthcare professional.'

export default function ResultsPage() {
  const { results, toDbHL, frequencies, resetSession, resetResultsOnly, userName } = useSession()
  const navigate = useNavigate()
  const chartRef = useRef(null)

  const leftData = Object.entries(results.left || {}).map(([f, db]) => ({
    frequency: Number(f), dbHL: toDbHL(db)
  })).sort((a, b) => a.frequency - b.frequency)

  const rightData = Object.entries(results.right || {}).map(([f, db]) => ({
    frequency: Number(f), dbHL: toDbHL(db)
  })).sort((a, b) => a.frequency - b.frequency)

  const hasResults = leftData.length > 0 || rightData.length > 0
  if (!hasResults) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <span className="text-5xl mb-4">🔍</span>
        <p className="text-slate-500 mb-6">No results yet. Complete a test first.</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-semibold hover:bg-indigo-700"
        >
          Start a test
        </button>
      </div>
    )
  }

  function classifyHL(dbHL) {
    if (dbHL === null) return { label: 'NR', color: 'text-slate-400' }
    if (dbHL <= 25) return { label: 'Normal', color: 'text-emerald-600' }
    if (dbHL <= 40) return { label: 'Mild', color: 'text-yellow-600' }
    if (dbHL <= 55) return { label: 'Moderate', color: 'text-orange-500' }
    if (dbHL <= 70) return { label: 'Mod-severe', color: 'text-red-500' }
    return { label: 'Severe', color: 'text-red-700' }
  }

  async function exportPDF() {
    const canvas = await html2canvas(chartRef.current, { scale: 2, backgroundColor: '#ffffff' })
    const imgData = canvas.toDataURL('image/png')

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW = pdf.internal.pageSize.getWidth()
    const margin = 15
    const contentW = pageW - margin * 2
    let y = margin

    // Title
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(18)
    pdf.text('Audiogram', margin, y)
    y += 8
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.setTextColor(100)
    if (userName) {
      pdf.setFontSize(13)
      pdf.setTextColor(30)
      pdf.setFont('helvetica', 'bold')
      pdf.text(userName, margin, y)
      y += 6
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)
      pdf.setTextColor(100)
    }
    pdf.text(`Test date: ${new Date().toLocaleDateString()}`, margin, y)
    y += 10

    // Chart image
    const imgH = (canvas.height / canvas.width) * contentW
    pdf.addImage(imgData, 'PNG', margin, y, contentW, imgH)
    y += imgH + 8

    // Threshold table
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(0)
    pdf.text('Threshold table (estimated dB HL)', margin, y)
    y += 6

    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'normal')
    const colW = contentW / (frequencies.length + 1)
    pdf.setFillColor(241, 245, 249)
    pdf.rect(margin, y, contentW, 6, 'F')
    pdf.text('Ear', margin + 2, y + 4)
    frequencies.forEach((f, i) => {
      pdf.text(formatFreq(f, { short: true }), margin + colW * (i + 1), y + 4)
    })
    y += 7

    ;[['Left', leftData], ['Right', rightData]].forEach(([label, data]) => {
      pdf.text(label, margin + 2, y + 4)
      frequencies.forEach((f, i) => {
        const entry = data.find(d => d.frequency === f)
        pdf.text(!entry ? '—' : entry.dbHL === null ? 'NR' : String(entry.dbHL), margin + colW * (i + 1), y + 4)
      })
      y += 7
    })

    y += 6

    // Disclaimer
    pdf.setFontSize(8)
    pdf.setTextColor(130)
    pdf.setFont('helvetica', 'italic')
    const lines = pdf.splitTextToSize(`⚠ ${DISCLAIMER}`, contentW)
    pdf.text(lines, margin, y)

    const safeName = userName ? `_${userName.replace(/[^a-z0-9]/gi, '_').slice(0, 30)}` : ''
    pdf.save(`audiogram${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  function handleRetake() {
    resetSession()
    navigate('/setup')
  }

  return (
    <div className="flex flex-col items-center min-h-screen px-4 py-10 max-w-lg mx-auto">
      <div className="w-full mb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">
            {userName ? `${userName}'s results` : 'Your results'}
          </h1>
          <span className="text-xs text-slate-400">{new Date().toLocaleDateString()}</span>
        </div>
        {userName && (
          <p className="text-sm text-slate-500 mt-0.5">👤 {userName}</p>
        )}
      </div>

      {/* Chart */}
      <div ref={chartRef} className="w-full bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-4">
        <AudiogramChart leftData={leftData} rightData={rightData} />
      </div>

      {/* Threshold table */}
      <div className="w-full bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-4 overflow-x-auto">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Thresholds (estimated dB HL *)</h2>
        <table className="w-full text-xs text-center">
          <thead>
            <tr className="bg-slate-50">
              <th className="py-2 px-2 text-left text-slate-500 font-medium">Ear</th>
              {frequencies.map(f => (
                <th key={f} className="py-2 px-1 text-slate-500 font-medium">
                  {formatFreq(f, { short: true })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[{ label: 'Left', data: leftData, color: 'text-blue-600' },
              { label: 'Right', data: rightData, color: 'text-red-500' }].map(({ label, data, color }) => (
              <tr key={label} className="border-t border-slate-50">
                <td className={`py-2 px-2 text-left font-semibold ${color}`}>{label}</td>
                {frequencies.map(f => {
                  const entry = data.find(d => d.frequency === f)
                  const cls = entry ? classifyHL(entry.dbHL) : null
                  return (
                    <td key={f} className={`py-2 px-1 font-medium ${cls?.color || 'text-slate-300'}`}>
                      {!entry ? '—' : entry.dbHL === null ? 'NR' : entry.dbHL}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-slate-400">
          * Accuracy depends on your device and headphones. Shape of the curve is more reliable than absolute values.
        </p>
      </div>

      {/* Legend */}
      <div className="w-full bg-slate-50 rounded-2xl border border-slate-100 p-4 mb-6 grid grid-cols-2 gap-2 text-xs">
        {[
          { range: '≤ 25', label: 'Normal', color: 'bg-emerald-100 text-emerald-700' },
          { range: '26–40', label: 'Mild loss', color: 'bg-yellow-100 text-yellow-700' },
          { range: '41–55', label: 'Moderate', color: 'bg-orange-100 text-orange-700' },
          { range: '56–70', label: 'Mod-severe', color: 'bg-red-100 text-red-600' },
        ].map(r => (
          <div key={r.label} className={`rounded-lg px-2 py-1 flex justify-between ${r.color}`}>
            <span>{r.label}</span><span className="font-medium">{r.range} dB HL</span>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
        <p className="text-xs text-amber-700 leading-relaxed">
          ⚠️ {DISCLAIMER}
        </p>
      </div>

      {/* Actions */}
      <div className="w-full flex flex-col gap-3">
        <button
          onClick={exportPDF}
          className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-semibold text-base hover:bg-indigo-700 active:scale-95 transition-all"
        >
          📄 Export PDF
        </button>

        {/* Compare mode — keeps calibration so both people are on the same dB scale */}
        <button
          onClick={() => { resetResultsOnly(); navigate('/setup') }}
          className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-semibold text-base hover:bg-emerald-700 active:scale-95 transition-all"
        >
          👤 Test another person
        </button>
        <p className="text-xs text-slate-400 text-center -mt-1 px-4">
          Keeps your volume setting so results are directly comparable. <strong>Do not change the volume.</strong>
        </p>

        <button
          onClick={handleRetake}
          className="w-full py-3 rounded-2xl bg-white border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50 active:scale-95 transition-all"
        >
          🔄 Retake my own test
        </button>
      </div>
    </div>
  )
}
