/**
 * AudiogramChart
 *
 * Features:
 *  - Standard audiogram axes (dB HL reversed Y, log-scale X)
 *  - Coloured hearing-range bands
 *  - Blue ✕ (left ear) / Red ○ (right ear) with connecting lines
 *  - NR (No Response) shown as ↓ arrow at bottom boundary
 *  - Toggleable pedagogic reference curves: child, 60-year-old, dog, bat
 *  - Dynamic X-axis domain derived from active frequencies
 */

import { useState } from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Label, ReferenceArea,
} from 'recharts'
import { formatFreq } from '../utils/formatFreq'
import { REFERENCE_CURVES } from '../data/referenceCurves'

// ── Hearing range bands ────────────────────────────────────────────────────────
const BANDS = [
  { min: -30, max: 25,  label: 'Normal',     bg: '#f0fdf4', text: '#16a34a' },
  { min: 25,  max: 40,  label: 'Mild',       bg: '#fefce8', text: '#ca8a04' },
  { min: 40,  max: 55,  label: 'Moderate',   bg: '#fff7ed', text: '#ea580c' },
  { min: 55,  max: 70,  label: 'Mod-severe', bg: '#fef2f2', text: '#dc2626' },
  { min: 70,  max: 125, label: 'Severe',     bg: '#fce7f3', text: '#9d174d' },
]

const Y_DOMAIN = [-30, 120]
const Y_TICKS  = [-20, 0, 25, 40, 55, 70, 90, 120]
const NR_Y     = 118   // Y position for NR arrow (bottom of chart)

// ── Dynamic X-axis config ──────────────────────────────────────────────────────
const TICK_SETS = {
  low: [20, 50, 125, 315, 800, 2000, 5000, 12500, 20000],
  mid: [125, 250, 500, 1000, 2000, 4000, 8000, 12500],
  std: [250, 500, 1000, 2000, 4000, 8000],
}
function getAxisConfig(allFreqs) {
  if (!allFreqs.length) return { domain: [200, 10000], ticks: TICK_SETS.std }
  const min = Math.min(...allFreqs)
  const max = Math.max(...allFreqs)
  const ticks = min <= 30 ? TICK_SETS.low : min <= 130 ? TICK_SETS.mid : TICK_SETS.std
  return { domain: [Math.max(10, Math.round(min / 1.6)), Math.round(max * 1.6)], ticks }
}

// ── Custom marker shapes ───────────────────────────────────────────────────────
const XDot = ({ cx, cy }) => {
  if (cx == null || cy == null) return null
  const s = 7
  return (
    <g>
      <line x1={cx-s} y1={cy-s} x2={cx+s} y2={cy+s} stroke="#3b82f6" strokeWidth={2.5} strokeLinecap="round" />
      <line x1={cx+s} y1={cy-s} x2={cx-s} y2={cy+s} stroke="#3b82f6" strokeWidth={2.5} strokeLinecap="round" />
    </g>
  )
}
const ODot = ({ cx, cy }) => {
  if (cx == null || cy == null) return null
  return <circle cx={cx} cy={cy} r={7} stroke="#ef4444" strokeWidth={2.5} fill="white" />
}

// Downward arrow — clinical convention for "not heard at max level tested"
const NRDot = ({ cx, cy, ear }) => {
  if (cx == null || cy == null) return null
  const color = ear === 'left' ? '#3b82f6' : '#ef4444'
  const s = 6
  return (
    <g>
      <line x1={cx} y1={cy-s} x2={cx} y2={cy+s} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <line x1={cx-s} y1={cy+s-5} x2={cx}   y2={cy+s+2} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <line x1={cx+s} y1={cy+s-5} x2={cx}   y2={cy+s+2} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    </g>
  )
}
const NRDotLeft  = (p) => <NRDot {...p} ear="left"  />
const NRDotRight = (p) => <NRDot {...p} ear="right" />

// Tiny dot for reference curves (virtually invisible — just drives the line)
const RefDot = ({ cx, cy, color }) => {
  if (cx == null || cy == null) return null
  return <circle cx={cx} cy={cy} r={3} fill={color} fillOpacity={0.5} stroke="none" />
}
const makeRefDot = (color) => (props) => <RefDot {...props} color={color} />

// ── Tooltip ────────────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload

  if (d.refName) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs shadow-lg">
        <p className="font-semibold text-slate-700 mb-1">{d.refName}</p>
        <p className="text-slate-500">{formatFreq(d.x)}</p>
        <p className="font-bold text-slate-700">{d.y} dB HL</p>
      </div>
    )
  }
  if (d.isNR) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs shadow-lg">
        <p className={`font-semibold mb-1 ${d.ear === 'left' ? 'text-blue-600' : 'text-red-500'}`}>
          {d.ear === 'left' ? '✕ Left ear' : '○ Right ear'}
        </p>
        <p className="text-slate-500">{formatFreq(d.x)}</p>
        <p className="font-bold text-red-600">NR — Not heard at maximum level</p>
      </div>
    )
  }
  const band = BANDS.find(b => d.y >= b.min && d.y < b.max) || BANDS[BANDS.length - 1]
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs shadow-lg">
      <p className={`font-semibold capitalize mb-1 ${d.ear === 'left' ? 'text-blue-600' : 'text-red-500'}`}>
        {d.ear === 'left' ? '✕ Left ear' : '○ Right ear'}
      </p>
      <p className="text-slate-500">{formatFreq(d.x)}</p>
      <p className="font-bold" style={{ color: band.text }}>{d.y} dB HL — {band.label}</p>
    </div>
  )
}

// ── Legend ─────────────────────────────────────────────────────────────────────
function ChartLegend({ showLeft, showRight }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 mt-3 mb-1">
      {showLeft && (
        <div className="flex items-center gap-1.5">
          <svg width="20" height="20" viewBox="0 0 20 20">
            <line x1="3" y1="3" x2="17" y2="17" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="17" y1="3" x2="3" y2="17" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <span className="text-sm font-medium text-blue-600">Left ear</span>
        </div>
      )}
      {showRight && (
        <div className="flex items-center gap-1.5">
          <svg width="20" height="20" viewBox="0 0 20 20">
            <circle cx="10" cy="10" r="6" stroke="#ef4444" strokeWidth="2.5" fill="white" />
          </svg>
          <span className="text-sm font-medium text-red-500">Right ear</span>
        </div>
      )}
      <div className="flex items-center gap-1.5 text-xs text-slate-400">
        <svg width="14" height="16" viewBox="0 0 14 16">
          <line x1="7" y1="1" x2="7" y2="10" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
          <line x1="3" y1="7" x2="7" y2="12" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
          <line x1="11" y1="7" x2="7" y2="12" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span>NR = Not heard at max level</span>
      </div>
    </div>
  )
}

// ── Reference curve toggles ────────────────────────────────────────────────────
function RefToggle({ visible, onToggle }) {
  return (
    <div className="mt-3 px-2">
      <p className="text-xs text-slate-400 text-center mb-2">
        📚 Reference curves — tap to compare
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {REFERENCE_CURVES.map(c => (
          <button
            key={c.id}
            onClick={() => onToggle(c.id)}
            title={c.note}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all active:scale-95
              ${visible.has(c.id)
                ? 'text-white border-transparent shadow-sm'
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
            style={visible.has(c.id) ? { background: c.color, borderColor: c.color } : {}}
          >
            <span>{c.emoji}</span>
            <span>{c.shortName}</span>
          </button>
        ))}
      </div>
      {/* Show note for active curves */}
      {REFERENCE_CURVES.filter(c => visible.has(c.id)).map(c => (
        <p key={c.id} className="text-xs text-center mt-1 px-4" style={{ color: c.color }}>
          {c.emoji} {c.name}: {c.note}
        </p>
      ))}
    </div>
  )
}

// ── Band key ───────────────────────────────────────────────────────────────────
function BandKey() {
  return (
    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2 px-2">
      {BANDS.map(b => (
        <span key={b.label} className="flex items-center gap-1 text-xs">
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: b.bg, border: `1px solid ${b.text}` }} />
          <span style={{ color: b.text }} className="font-medium">{b.label}</span>
        </span>
      ))}
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────────
export default function AudiogramChart({ leftData = [], rightData = [], forPDF = false }) {
  const [visibleRefs, setVisibleRefs] = useState(new Set())

  function toggleRef(id) {
    setVisibleRefs(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Separate NR points (dbHL === null) from normal points
  const leftNormal  = leftData.filter(d => d.dbHL !== null).map(d => ({ x: d.frequency, y: d.dbHL, ear: 'left'  }))
  const leftNR      = leftData.filter(d => d.dbHL === null).map(d => ({ x: d.frequency, y: NR_Y,   ear: 'left',  isNR: true }))
  const rightNormal = rightData.filter(d => d.dbHL !== null).map(d => ({ x: d.frequency, y: d.dbHL, ear: 'right' }))
  const rightNR     = rightData.filter(d => d.dbHL === null).map(d => ({ x: d.frequency, y: NR_Y,   ear: 'right', isNR: true }))

  const allFreqs = [...new Set([...leftData, ...rightData].map(d => d.frequency))]
  const { domain, ticks } = getAxisConfig(allFreqs)

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={340}>
        <ScatterChart margin={{ top: 8, right: 16, bottom: 28, left: 8 }}>

          {BANDS.map(b => (
            <ReferenceArea key={b.label} y1={b.min} y2={b.max} fill={b.bg} fillOpacity={0.8} ifOverflow="extendDomain" />
          ))}

          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />

          <XAxis
            type="number" dataKey="x" name="Frequency" scale="log"
            domain={domain} ticks={ticks}
            tickFormatter={v => formatFreq(v, { short: true })}
            tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false}
            axisLine={{ stroke: '#cbd5e1' }}
          >
            <Label value="Frequency (Hz)" position="bottom" offset={14} fontSize={11} fill="#94a3b8" />
          </XAxis>

          <YAxis
            type="number" dataKey="y" name="dB HL"
            domain={Y_DOMAIN} reversed ticks={Y_TICKS}
            tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={34}
          >
            <Label value="dB HL" angle={-90} position="insideLeft" offset={8} fontSize={11} fill="#94a3b8" />
          </YAxis>

          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }} />

          {/* Reference curves */}
          {REFERENCE_CURVES.filter(c => visibleRefs.has(c.id)).map(c => (
            <Scatter
              key={c.id}
              data={c.points.map(p => ({ x: p.freq, y: p.dbHL, refName: `${c.emoji} ${c.name}` }))}
              shape={makeRefDot(c.color)}
              line={{ stroke: c.color, strokeWidth: 1.5, strokeDasharray: c.dash }}
              lineType="joint"
            />
          ))}

          {/* User data — normal thresholds */}
          {leftNormal.length  > 0 && <Scatter data={leftNormal}  shape={<XDot />} line={{ stroke: '#3b82f6', strokeWidth: 2 }} lineType="joint" />}
          {rightNormal.length > 0 && <Scatter data={rightNormal} shape={<ODot />} line={{ stroke: '#ef4444', strokeWidth: 2 }} lineType="joint" />}

          {/* NR markers — no connecting line */}
          {leftNR.length  > 0 && <Scatter data={leftNR}  shape={<NRDotLeft  />} />}
          {rightNR.length > 0 && <Scatter data={rightNR} shape={<NRDotRight />} />}

        </ScatterChart>
      </ResponsiveContainer>

      <ChartLegend showLeft={leftData.length > 0} showRight={rightData.length > 0} />
      <BandKey />

      {/* Interactive controls — hidden in PDF export */}
      {!forPDF && <RefToggle visible={visibleRefs} onToggle={toggleRef} />}

      <p className="text-xs text-slate-400 text-center mt-3 px-2">
        * Estimated — accuracy depends on your device and headphones
      </p>
    </div>
  )
}
