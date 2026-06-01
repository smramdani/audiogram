/**
 * Pedagogic reference hearing curves.
 *
 * All values in estimated dB HL, normalised so that 0 dB HL = average
 * young adult threshold (ISO 389 / ANSI S3.6 audiometric zero).
 *
 * Values < 0  → better sensitivity than average adult
 * Values > 25 → outside "normal" range
 *
 * Sources / notes:
 *  - Child   : ISO 7029 (children have slightly better sensitivity, esp. at HF)
 *  - 60-year-old: ISO 7029 median threshold shifts for age 60 (presbycusis)
 *  - Dog     : Heffner & Heffner 1983; Fay 1988 — best range 2–65 kHz
 *  - Bat     : Simmons et al. 1979 (Eptesicus fuscus) — best range 20–100 kHz,
 *              so the 20 kHz point on our chart is already within their sweet spot.
 *
 * Data points cover all ISO ½-octave frequencies (20 Hz – 20 kHz).
 * The chart interpolates/clips to whatever frequency set is active.
 */

export const REFERENCE_CURVES = [
  {
    id: 'child',
    name: 'Normal child (5–10 y)',
    shortName: 'Child',
    emoji: '🧒',
    color: '#8b5cf6',
    dash: '6 3',
    note: 'Children have slightly better sensitivity than adults, especially above 2 kHz',
    // Points at each ISO ½-octave centre frequency
    points: [
      { freq: 20,    dbHL: 72 },
      { freq: 32,    dbHL: 48 },
      { freq: 50,    dbHL: 26 },
      { freq: 80,    dbHL: 12 },
      { freq: 125,   dbHL: 8  },
      { freq: 200,   dbHL: 5  },
      { freq: 315,   dbHL: 3  },
      { freq: 500,   dbHL: 2  },
      { freq: 800,   dbHL: 0  },
      { freq: 1250,  dbHL: -2 },
      { freq: 2000,  dbHL: -3 },
      { freq: 3150,  dbHL: -3 },
      { freq: 5000,  dbHL: -2 },
      { freq: 8000,  dbHL: 2  },
      { freq: 12500, dbHL: 8  },
      { freq: 20000, dbHL: 18 },
    ],
  },
  {
    id: 'adult60',
    name: '60-year-old (typical)',
    shortName: '60 y',
    emoji: '👴',
    color: '#f59e0b',
    dash: '8 4',
    note: 'Typical presbycusis: gradual high-frequency loss starting around 2 kHz',
    points: [
      { freq: 20,    dbHL: 75 },
      { freq: 32,    dbHL: 52 },
      { freq: 50,    dbHL: 30 },
      { freq: 80,    dbHL: 15 },
      { freq: 125,   dbHL: 10 },
      { freq: 200,   dbHL: 10 },
      { freq: 315,   dbHL: 11 },
      { freq: 500,   dbHL: 12 },
      { freq: 800,   dbHL: 14 },
      { freq: 1250,  dbHL: 16 },
      { freq: 2000,  dbHL: 21 },
      { freq: 3150,  dbHL: 32 },
      { freq: 5000,  dbHL: 42 },
      { freq: 8000,  dbHL: 56 },
      { freq: 12500, dbHL: 72 },
      { freq: 20000, dbHL: 95 },
    ],
  },
  {
    id: 'dog',
    name: 'Dog',
    shortName: 'Dog',
    emoji: '🐕',
    color: '#10b981',
    dash: '4 4',
    note: 'Dogs hear up to ~65 kHz — far better than humans at high frequencies',
    points: [
      { freq: 20,    dbHL: 88 },
      { freq: 32,    dbHL: 68 },
      { freq: 50,    dbHL: 46 },
      { freq: 80,    dbHL: 28 },
      { freq: 125,   dbHL: 18 },
      { freq: 200,   dbHL: 12 },
      { freq: 315,   dbHL: 7  },
      { freq: 500,   dbHL: 4  },
      { freq: 800,   dbHL: 1  },
      { freq: 1250,  dbHL: -1 },
      { freq: 2000,  dbHL: -3 },
      { freq: 3150,  dbHL: -6 },
      { freq: 5000,  dbHL: -10 },
      { freq: 8000,  dbHL: -14 },
      { freq: 12500, dbHL: -10 },
      { freq: 20000, dbHL: -3  },
    ],
  },
  {
    id: 'bat',
    name: 'Bat (echolocating)',
    shortName: 'Bat',
    emoji: '🦇',
    color: '#6366f1',
    dash: '3 3',
    note: 'Echolocating bats are almost deaf at low frequencies but exceptional above 20 kHz — our chart shows only the beginning of their optimal range',
    points: [
      { freq: 20,    dbHL: 112 },
      { freq: 32,    dbHL: 100 },
      { freq: 50,    dbHL: 88  },
      { freq: 80,    dbHL: 74  },
      { freq: 125,   dbHL: 60  },
      { freq: 200,   dbHL: 48  },
      { freq: 315,   dbHL: 36  },
      { freq: 500,   dbHL: 26  },
      { freq: 800,   dbHL: 16  },
      { freq: 1250,  dbHL: 8   },
      { freq: 2000,  dbHL: 3   },
      { freq: 3150,  dbHL: -3  },
      { freq: 5000,  dbHL: -10 },
      { freq: 8000,  dbHL: -18 },
      { freq: 12500, dbHL: -24 },
      { freq: 20000, dbHL: -30 },  // ← their sweet spot starts here
    ],
  },
]

/** Sentinel stored in results to mean "frequency not audible at maximum level tested" */
export const NR = null
