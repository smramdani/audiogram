/**
 * audioEngine.js
 * Pure Web Audio API tone generator with stereo panning.
 * All dB values are relative digital gain — mapped to estimated dB HL
 * via the calibration anchor established in the calibration step.
 */

let audioCtx = null

function getCtx() {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

/**
 * Play a pure sine tone.
 * @param {number} frequency  - Hz
 * @param {number} gainDb     - digital gain in dB (0 = full scale, −60 = very quiet)
 * @param {'left'|'right'} ear
 * @param {number} durationMs - tone duration in ms (default 1000)
 * @returns {Function} stop() — call to cut the tone early
 */
export function playTone(frequency, gainDb, ear, durationMs = 1000) {
  const ctx = getCtx()
  const fadeDuration = 0.05 // 50 ms fade in/out

  // Oscillator
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.value = frequency

  // Gain envelope (fade in/out to avoid clicks)
  const gainNode = ctx.createGain()
  const linearGain = Math.pow(10, gainDb / 20)
  gainNode.gain.setValueAtTime(0, ctx.currentTime)
  gainNode.gain.linearRampToValueAtTime(linearGain, ctx.currentTime + fadeDuration)
  gainNode.gain.setValueAtTime(linearGain, ctx.currentTime + durationMs / 1000 - fadeDuration)
  gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + durationMs / 1000)

  // Stereo panner — hard left or hard right
  const panner = ctx.createStereoPanner()
  panner.pan.value = ear === 'left' ? -1 : 1

  osc.connect(gainNode)
  gainNode.connect(panner)
  panner.connect(ctx.destination)

  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + durationMs / 1000 + 0.01)

  return () => {
    try {
      gainNode.gain.cancelScheduledValues(ctx.currentTime)
      gainNode.gain.setValueAtTime(gainNode.gain.value, ctx.currentTime)
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.03)
      osc.stop(ctx.currentTime + 0.04)
    } catch (_) {
      // already stopped
    }
  }
}

/**
 * Resume AudioContext after a user gesture (required by browsers).
 */
export function resumeAudio() {
  getCtx()
}
