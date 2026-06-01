/**
 * Format a frequency value for display.
 * 250    → "250 Hz"
 * 1000   → "1 kHz"
 * 1250   → "1.25 kHz"
 * 3150   → "3.15 kHz"
 * 12500  → "12.5 kHz"
 * 20000  → "20 kHz"
 */
export function formatFreq(hz, { short = false } = {}) {
  if (hz < 1000) return short ? `${hz}` : `${hz} Hz`
  const k = hz / 1000
  // Remove trailing zeros: 1.00 → "1", 1.25 → "1.25", 3.15 → "3.15"
  const kStr = parseFloat(k.toFixed(2)).toString()
  return short ? `${kStr}k` : `${kStr} kHz`
}
