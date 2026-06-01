# PRD — Audiogram Web Application

> **Implementation status (v0.1.0):** This document has been reconciled with the as-built application. Functional requirements below reflect what is actually implemented; the few items not yet built are explicitly marked _(planned)_. See [README.md](README.md) for a feature-oriented overview.

## 1. Problem Statement

People with hearing concerns have no easy, free way to get a first-picture of their hearing sensitivity across frequencies without visiting a clinic. This app lets anyone with a smartphone and headphones run a self-administered hearing test, see their results as a standard audiogram, and export a PDF to share with a doctor if needed.

---

## 2. Goals & Non-Goals

### Goals (v1 scope)
- Deliver a guided, frequency-sweep hearing test playable entirely in a mobile browser.
- Support separate left-ear / right-ear testing via stereo headphones.
- Render a standard audiogram chart (dB HL vs. frequency) for both ears.
- Export the audiogram as a PDF report.
- Cover a configurable frequency range (default: 250 Hz – 8 000 Hz, standard clinical octave bands).

### Non-Goals (deferred)
- Medical diagnosis or clinical certification.
- User accounts, login, or server-side data storage.
- Bone-conduction testing.
- Noise-masking (clinical masking protocol).
- iOS/Android native app (PWA covers the mobile need for v1).

---

## 3. Users

**Primary persona — Self-tester (individual consumer)**
- No audiological training.
- Uses a smartphone with wired or wireless headphones / earbuds.
- Wants simple instructions and a clear result they can share with their GP.
- No expectation of medical-grade accuracy — seeks a useful first indicator.

---

## 4. Key User Flows

### Flow A — Guided automatic sweep
1. User opens the app on their phone.
2. App prompts: put on headphones, select which ear to test first.
3. App steps automatically through each frequency (e.g. 250, 500, 1k, 2k, 4k, 8k Hz).
4. At each frequency the app plays a pure tone at decreasing dB levels.
5. User taps a large "I hear it" button while they can hear the tone.
6. App records the lowest dB level at which the user responded → threshold for that frequency.
7. Repeat for the other ear.
8. Audiogram rendered; PDF export offered.

### Flow B — Manual step-by-step
1. Same setup as Flow A.
2. User controls playback: "Play tone", "I hear it / I don't hear it", "Next frequency".
3. Allows re-testing a frequency before moving on.
4. Same result rendering and export.

---

## 5. Functional Requirements

### 5.1 Setup & Calibration
- **FR-01** The app MUST display a pre-test checklist before any test begins: headphones required, quiet environment, do not change volume during the test.
- **FR-02** The app MUST run a **volume calibration step** before the first test:
  - Play a 1 kHz reference sine tone at a fixed digital amplitude.
  - Instruct the user: *"Adjust your device volume until this tone sounds like a normal conversation — clearly audible but not loud."*
  - Once the user confirms ("Sounds right"), lock the instruction and record an internal calibration offset mapping that volume level to ~65 dB SPL.
  - This anchor is used to express all subsequent thresholds as estimated dB HL values.
- **FR-03** The app MUST let the user select Left or Right ear before each test run.
- **FR-04** The app MUST allow the user to configure the frequency range (min, max) and step (octave / half-octave / custom).
- **FR-05** Default frequency set: 250, 500, 1000, 2000, 4000, 8000 Hz.

### 5.2 Tone Generation
- **FR-06** Pure sine-wave tones generated client-side via the Web Audio API.
- **FR-07** Tone panning MUST be hard-left (L=1, R=0) or hard-right (L=0, R=1) depending on selected ear.
- **FR-08** Threshold search runs in two phases per frequency:
  - **Coarse phase** — starting at −10 dBFS, descend in **25 dB steps** while the tone is heard (fast bracketing). On the first miss, hand over to the fine phase resuming from the last-heard level.
  - **Fine phase (Hughson-Westlake)** — step **down 10 dB** on heard, **up 5 dB** on missed. Threshold = lowest level heard on **≥ 2 ascending trials** at the same level.
  - **Floor** — if the tone is still heard at −100 dBFS, that level is recorded as the threshold.
  - **No Response (NR)** — after **3 consecutive misses at the 0 dBFS ceiling**, the frequency is marked NR.
- **FR-09** Each tone playback MUST have a defined duration (default 1 s) with 50 ms fade-in/out to avoid clicks.

### 5.3 Test Modes
- **FR-10** **Auto sweep** — app drives progression, plays each tone, and treats no response within ~4.5 s as "not heard", then continues the algorithm automatically.
- **FR-11** **Manual mode** — user triggers each tone via a "Play" button and marks heard / not-heard; the algorithm advances automatically once a threshold (or NR) is found.
- **FR-12** User can switch mode from the settings panel before starting the test.
- **FR-13** User can re-test any single frequency during the session by tapping its (completed) frequency chip, without restarting the full sweep.

### 5.4 Audiogram Chart
- **FR-14** Chart plots dB HL (y-axis inverted, domain −30 at top to 120 at bottom) vs. frequency in Hz (x-axis, logarithmic scale). The x-axis domain and ticks adapt to the active frequency preset.
- **FR-15** Standard symbols: O (red, right ear), X (blue, left ear), connected by lines; NR shown as a downward arrow ↓ at the bottom boundary.
- **FR-16** Estimated dB HL values are plotted with coloured hearing-range bands (Normal / Mild / Moderate / Mod-severe / Severe) and labelled *"Estimated — accuracy depends on your device and headphones."* Toggleable pedagogic reference curves (child, 60-year-old, dog, bat) can be overlaid.
- **FR-17** Both ears shown on the same chart when both have been tested.
- **FR-18** Chart is responsive and readable on a 375 px wide screen.

### 5.5 Disclaimer
- **FR-19** A disclaimer MUST be visible on the landing page and on the results page:
  > *"This application is for informational, educational, and personal use only. It is not a medical device and does not produce clinically accurate results. If you have any concerns about your hearing, please consult a qualified audiologist or healthcare professional."*
- **FR-20** The disclaimer MUST be acknowledged (checkbox or "I understand" button) before the user can start the first test. It does not need to be re-acknowledged on subsequent tests in the same session.

### 5.6 PDF Export
- **FR-21** Export includes: audiogram chart image, user name (if given), test date, frequency/threshold table, ear labels, and the full disclaimer text. Interactive controls (reference-curve toggles) are excluded from the captured chart.
- **FR-22** PDF is generated client-side (no data sent to a server).
- **FR-23** File name format: `audiogram_<Name>_YYYY-MM-DD.pdf` (name omitted if not provided).

### 5.7 Frequency Configuration
- **FR-24** The setup screen lets the user pick one of four **frequency presets**: Standard clinical (250–8 000 Hz), Half-octave, Extended (125 Hz–12 kHz), and Full range (20 Hz–20 kHz, ISO ½-octave). _(Free min/max/step entry is not implemented — presets cover the use cases.)_
- **FR-25** All preset frequencies lie within the 20 Hz – 20 000 Hz human audible range.

### 5.8 User Name & Test History
- **FR-26** The setup screen accepts an optional **user name**, shown on the results page and printed in the PDF.
- **FR-27** From the results page the user can **save the current test to an in-session history** (name, date/time, frequencies, results, calibration anchor). History is in-memory and cleared on page reload.
- **FR-28** A **history page** lists saved tests with date/time, name and a colour-coded threshold summary, and lets the user **rename**, **delete** individual tests, or **reset all**.
- **FR-29** The user can select two or more saved tests to **compare** them on a single overlaid chart (per-user colour; left ear = solid ✕, right ear = dashed ○) and export the comparison as a PDF.
- **FR-30** "**Test another person**" resets only the threshold results while keeping the calibration anchor, so multiple users tested in one session are measured on the same physical scale.

---

## 6. Non-Functional Requirements

| # | Requirement |
|---|-------------|
| NFR-01 | Works on Safari iOS 16+, Chrome Android 110+, and desktop Chrome/Firefox/Safari. |
| NFR-02 | All audio and PDF generation runs client-side — zero backend for v1. |
| NFR-03 | App is installable as a PWA (manifest + service worker) for offline use. _(planned — not yet implemented)_ |
| NFR-04 | First meaningful paint < 2 s on a 4G connection. |
| NFR-05 | Touch targets ≥ 48 × 48 px. |
| NFR-06 | No data is transmitted or stored externally. |

---

## 7. Recommended Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | **React + Vite** | Fast dev build, excellent mobile browser support, no server needed for v1 |
| Audio | **Web Audio API** (native browser) | Pure-tone synthesis + stereo panning built in |
| Charting | **Recharts** or **Chart.js** | Responsive, easy log-scale x-axis |
| PDF | **jsPDF + html2canvas** | Client-side, widely used |
| PWA | **vite-plugin-pwa** | Adds manifest + service worker with minimal config |
| Styling | **Tailwind CSS** | Mobile-first, utility classes, fast iteration |

> Stack can be swapped without invalidating the PRD — the requirements are stack-agnostic except for the Web Audio API dependency (available in all modern mobile browsers).

---

## 8. MVP Scope (Iteration 1)

The smallest thing that delivers value end-to-end:

1. Landing page with disclaimer — user must acknowledge before proceeding.
2. Volume calibration step (1 kHz reference tone + user confirmation).
3. Pre-test screen: headphone reminder + ear selector.
4. Auto sweep mode only — Hughson-Westlake threshold search per frequency.
5. Fixed default frequency set (250–8000 Hz, 6 standard frequencies).
6. Pure-tone generation with hard stereo panning.
7. Audiogram chart (relative shape + estimated dB HL with caveat label).
8. PDF export including disclaimer text.

**Delivered since MVP:**
- **Iteration 2** ✅ — Manual mode, re-test a single frequency, frequency presets, sticky app header.
- **Test history** ✅ — Save/list/rename/delete/reset tests in-session, multi-user comparison chart, comparison PDF, per-user name.
- **Range & engine** ✅ — Full-range preset (20 Hz–20 kHz), NR detection, −100 dBFS floor, coarse-descent acceleration.

**Planned next:**
- PWA / offline support (manifest + service worker).
- Persist history in `localStorage` so it survives a page reload.
- Plain-language interpretation hints ("thresholds appear elevated at high frequencies").
- Loudness calibration improvement (optional sound-level-meter integration).

---

## 9. Open Questions

| # | Question | Owner | Priority |
|---|---|---|---|
| ~~OQ-01~~ | ~~Volume calibration approach~~ | — | **Resolved** — single-point voluntary loudness match at 1 kHz + two-phase threshold search. |
| ~~OQ-02~~ | ~~Medical disclaimer~~ | — | **Resolved** — mandatory acknowledgement on first use; disclaimer printed on PDF. |
| ~~OQ-04~~ | ~~Compare multiple tests on one chart~~ | — | **Resolved** — in-session multi-user comparison chart + comparison PDF implemented. |
| OQ-03 | Should the history persist in `localStorage` across page reloads? (Currently in-memory only — history view itself is built.) | Product | Medium |
| OQ-05 | Should we add plain-language interpretation of results for non-expert users? | Product | Low |

---

## 10. Success Metrics (post-launch)

- A user can complete a full two-ear test in < 10 minutes.
- PDF export works on iOS Safari and Android Chrome without errors.
- User can interpret their audiogram without reading documentation (validated by 5-person usability test).
