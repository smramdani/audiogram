/**
 * ComparisonChart
 * Overlays multiple users' audiograms on one chart.
 * Each user gets a colour from the palette.
 * Left ear  = solid line + ✕ symbol
 * Right ear = dashed line + ○ symbol
 */

import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Label, ReferenceArea,
} from 'recharts'
import { formatFreq } from '../utils/formatFreq'

const BANDS = [
  { min: -30, max: 25,  label: 'Normal',     bg: '#f0fdf4', text: '#16a34a' },
  { min: 25,  max: 40,  label: 'Mild',       bg: '#fefce8', text: '#ca8a04' },
  { min: 40,  max: 55,  label: 'Moderate',   bg: '#fff7ed', text: '#ea580c' },
  { min: 55,  max: 70,  label: 'Mod-severe', bg: '#fef2f2', text: '#dc2626' },
  { min: 70,  max: 125, label: 'Severe',     bg: '#fce7f3', text: '#9d174d' },
]

export const PALETTE = [
  '#2563eb', '#d97706', '#16a34a', '#9333ea',
  '#0891b2', '#dc2626', '#ea580c', '#65a30d',
]

const Y_DOMAIN = [-30, 120]
const Y_TICKS  = [-20, 0, 25, 40, 55, 70, 90, 120]
const NR_Y     = 118

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

// Per-user coloured symbols
const makeXDot = (color) => ({ cx, cy }) => {
  if (cx == null || cy == null) return null
  const s = 6
  return (
    <g>
      <line x1={cx-s} y1={cy-s} x2={cx+s} y2={cy+s} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <line x1={cx+s} y1={cy-s} x2={cx-s} y2={cy+s} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    </g>
  )
}
const makeODot = (color) => ({ cx, cy }) => {
  if (cx == null || cy == null) return null
  return <circle cx={cx} cy={cy} r={6} stroke={color} strokeWidth={2.5} fill="white" />
}
const makeNRDot = (color) => ({ cx, cy }) => {
  if (cx == null || cy == null) return null
  const s = 5
  return (
    <g>
      <line x1={cx} y1={cy-s} x2={cx} y2={cy+s} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <line x1={cx-s} y1={cy+s-4} x2={cx} y2={cy+s+1} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <line x1={cx+s} y1={cy+s-4} x2={cx} y2={cy+s+1} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    </g>
  )
}

const CompTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  if (d.isNR) return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold mb-1" style={{ color: d.color }}>{d.userName}</p>
      <p className="text-slate-500">{formatFreq(d.x)} — {d.ear === 'left' ? 'Left' : 'Right'} ear</p>
      <p className="font-bold text-red-600">NR — Not heard at max level</p>
    </div>
  )
  const band = BANDS.find(b => d.y >= b.min && d.y < b.max) || BANDS[BANDS.length - 1]
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold mb-1" style={{ color: d.color }}>{d.userName}</p>
      <p className="text-slate-500">{formatFreq(d.x)} — {d.ear === 'left' ? 'Left ✕' : 'Right ○'} ear</p>
      <p className="font-bold" style={{ color: band.text }}>{d.y} dB HL — {band.label}</p>
    </div>
  )
}

/**
 * @param {Array} datasets — [{ id, name, leftData, rightData }]
 *   where leftData/rightData = [{frequency, dbHL}]
 * @param {boolean} forPDF
 */
export default function ComparisonChart({ datasets = [], forPDF = false }) {
  if (!datasets.length) return null

  const allFreqs = [...new Set(
    datasets.flatMap(d => [...d.leftData, ...d.rightData].map(p => p.frequency))
  )]
  const { domain, ticks } = getAxisConfig(allFreqs)

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={340}>
        <ScatterChart margin={{ top: 8, right: 16, bottom: 28, left: 8 }}>
          {BANDS.map(b => (
            <ReferenceArea key={b.label} y1={b.min} y2={b.max} fill={b.bg} fillOpacity={0.8} ifOverflow="extendDomain" />
          ))}

          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />

          <XAxis type="number" dataKey="x" name="Frequency" scale="log"
            domain={domain} ticks={ticks}
            tickFormatter={v => formatFreq(v, { short: true })}
            tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }}
          >
            <Label value="Frequency (Hz)" position="bottom" offset={14} fontSize={11} fill="#94a3b8" />
          </XAxis>

          <YAxis type="number" dataKey="y" name="dB HL"
            domain={Y_DOMAIN} reversed ticks={Y_TICKS}
            tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={34}
          >
            <Label value="dB HL" angle={-90} position="insideLeft" offset={8} fontSize={11} fill="#94a3b8" />
          </YAxis>

          <Tooltip content={<CompTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }} />

          {datasets.map((ds, i) => {
            const color  = PALETTE[i % PALETTE.length]
            const normal = ds.leftData.filter(d => d.dbHL !== null).map(d => ({ x: d.frequency, y: d.dbHL, ear: 'left',  userName: ds.name, color }))
            const nrL    = ds.leftData.filter(d => d.dbHL === null).map(d => ({ x: d.frequency, y: NR_Y,   ear: 'left',  userName: ds.name, color, isNR: true }))
            const normalR= ds.rightData.filter(d => d.dbHL !== null).map(d => ({ x: d.frequency, y: d.dbHL, ear: 'right', userName: ds.name, color }))
            const nrR    = ds.rightData.filter(d => d.dbHL === null).map(d => ({ x: d.frequency, y: NR_Y,   ear: 'right', userName: ds.name, color, isNR: true }))
            const XDot = makeXDot(color)
            const ODot = makeODot(color)
            const NRDot = makeNRDot(color)
            return [
              normal.length  > 0 && <Scatter key={`${ds.id}-L`}  data={normal}  shape={<XDot />} line={{ stroke: color, strokeWidth: 2 }}                      lineType="joint" />,
              normalR.length > 0 && <Scatter key={`${ds.id}-R`}  data={normalR} shape={<ODot />} line={{ stroke: color, strokeWidth: 2, strokeDasharray: '5 4' }} lineType="joint" />,
              nrL.length  > 0 && <Scatter key={`${ds.id}-NRL`} data={nrL}  shape={<NRDot />} />,
              nrR.length  > 0 && <Scatter key={`${ds.id}-NRR`} data={nrR}  shape={<NRDot />} />,
            ]
          })}
        </ScatterChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-3 px-2">
        {datasets.map((ds, i) => {
          const color = PALETTE[i % PALETTE.length]
          return (
            <div key={ds.id} className="flex items-center gap-2 text-xs">
              <span className="inline-block w-3 h-3 rounded-full" style={{ background: color }} />
              <span className="font-medium" style={{ color }}>{ds.name}</span>
              <span className="text-slate-400">✕ L &nbsp; ○ R</span>
            </div>
          )
        })}
      </div>

      {/* Band key */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2 mb-1 px-2">
        {BANDS.map(b => (
          <span key={b.label} className="flex items-center gap-1 text-xs">
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: b.bg, border: `1px solid ${b.text}` }} />
            <span style={{ color: b.text }} className="font-medium">{b.label}</span>
          </span>
        ))}
      </div>

      {!forPDF && (
        <p className="text-xs text-slate-400 text-center mt-2 px-2">
          Solid line = left ear (✕) &nbsp;·&nbsp; Dashed line = right ear (○)
        </p>
      )}
    </div>
  )
}
