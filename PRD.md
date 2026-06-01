# PRD — Audiogram Web Application

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
- **FR-08** Threshold search MUST follow a simplified **Hughson-Westlake** algorithm per frequency:
  - Start at a level clearly above the estimated threshold (default: 40 dB above calibration anchor).
  - Step **down 10 dB** each time the user hears the tone.
  - Step **up 5 dB** each time the user misses it.
  - Threshold = lowest level heard on ≥ 2 of 3 ascending trials.
- **FR-09** Each tone playback MUST have a defined duration (default 1 s) with 50 ms fade-in/out to avoid clicks.

### 5.3 Test Modes
- **FR-10** **Auto sweep** — app drives progression, plays each tone, waits for user response or timeout (5 s default), then moves to next step.
- **FR-11** **Manual mode** — user triggers each tone via a "Play" button; marks heard/not-heard; advances with "Next".
- **FR-12** User can switch mode from the settings panel before starting the test.
- **FR-13** User can re-test any single frequency during the session without restarting the full sweep.

### 5.4 Audiogram Chart
- **FR-14** Chart plots dB HL (y-axis, 0 at top, −10 to 120) vs. frequency in Hz (x-axis, logarithmic scale).
- **FR-15** Standard symbols: O (red, right ear), X (blue, left ear).
- **FR-16** Chart shows **two layers**:
  - Primary: relative audiogram (shape — always accurate regardless of device).
  - Secondary: estimated absolute dB HL values from the calibration anchor, labelled *"Estimated — accuracy depends on your device and headphones."*
- **FR-17** Both ears shown on the same chart when both have been tested.
- **FR-18** Chart is responsive and readable on a 375 px wide screen.

### 5.5 Disclaimer
- **FR-19** A disclaimer MUST be visible on the landing page and on the results page:
  > *"This application is for informational, educational, and personal use only. It is not a medical device and does not produce clinically accurate results. If you have any concerns about your hearing, please consult a qualified audiologist or healthcare professional."*
- **FR-20** The disclaimer MUST be acknowledged (checkbox or "I understand" button) before the user can start the first test. It does not need to be re-acknowledged on subsequent tests in the same session.

### 5.6 PDF Export
- **FR-21** Export includes: audiogram chart image, test date, frequency/threshold table, ear labels, and the full disclaimer text.
- **FR-22** PDF is generated client-side (no data sent to a server).
- **FR-23** File name format: `audiogram_YYYY-MM-DD.pdf`.

### 5.7 Frequency Configuration
- **FR-24** Settings panel lets user set: start frequency, end frequency, step (octave/half-octave/custom Hz list).
- **FR-25** Frequency range validates that all values are within 20 Hz – 20 000 Hz.

---

## 6. Non-Functional Requirements

| # | Requirement |
|---|-------------|
| NFR-01 | Works on Safari iOS 16+, Chrome Android 110+, and desktop Chrome/Firefox/Safari. |
| NFR-02 | All audio and PDF generation runs client-side — zero backend for v1. |
| NFR-03 | App is installable as a PWA (manifest + service worker) for offline use. |
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

**Iteration 2** — Manual step-by-step mode, re-test a single frequency, frequency configuration UI.  
**Iteration 3** — PWA / offline support, half-octave bands, UX polish.  
**Iteration 4** — Extended frequencies (125 Hz, 16 kHz), plain-language interpretation hints ("thresholds appear elevated at high frequencies"), share/print link.

---

## 9. Open Questions

| # | Question | Owner | Priority |
|---|---|---|---|
| ~~OQ-01~~ | ~~Volume calibration approach~~ | — | **Resolved** — single-point voluntary loudness match at 1 kHz + Hughson-Westlake threshold search. |
| ~~OQ-02~~ | ~~Medical disclaimer~~ | — | **Resolved** — mandatory acknowledgement on first use; disclaimer printed on PDF. |
| OQ-03 | Should results persist in localStorage between sessions to enable a "history" view? | Product | Medium |
| OQ-04 | Is there demand for a "compare over time" view (two test dates on the same chart)? | Product | Low |

---

## 10. Success Metrics (post-launch)

- A user can complete a full two-ear test in < 10 minutes.
- PDF export works on iOS Safari and Android Chrome without errors.
- User can interpret their audiogram without reading documentation (validated by 5-person usability test).
