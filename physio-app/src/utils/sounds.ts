function ctx(): AudioContext | null {
  try { return new AudioContext() } catch { return null }
}

export function playSuccessChime(): void {
  const c = ctx(); if (!c) return
  ;[{ f: 523.25, t: 0 }, { f: 659.25, t: 0.12 }, { f: 783.99, t: 0.24 }].forEach(({ f, t }) => {
    const osc = c.createOscillator(), g = c.createGain()
    osc.connect(g); g.connect(c.destination)
    osc.type = 'sine'; osc.frequency.setValueAtTime(f, c.currentTime + t)
    g.gain.setValueAtTime(0, c.currentTime + t)
    g.gain.linearRampToValueAtTime(0.22, c.currentTime + t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + t + 0.45)
    osc.start(c.currentTime + t); osc.stop(c.currentTime + t + 0.45)
  })
  setTimeout(() => c.close(), 1500)
}

export function playConfirmBeep(): void {
  const c = ctx(); if (!c) return
  const osc = c.createOscillator(), g = c.createGain()
  osc.connect(g); g.connect(c.destination)
  osc.type = 'sine'; osc.frequency.setValueAtTime(880, c.currentTime)
  g.gain.setValueAtTime(0, c.currentTime)
  g.gain.linearRampToValueAtTime(0.1, c.currentTime + 0.01)
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15)
  osc.start(); osc.stop(c.currentTime + 0.15)
  setTimeout(() => c.close(), 500)
}

export function playErrorTone(): void {
  const c = ctx(); if (!c) return
  const osc = c.createOscillator(), g = c.createGain()
  osc.connect(g); g.connect(c.destination)
  osc.type = 'sine'
  osc.frequency.setValueAtTime(300, c.currentTime)
  osc.frequency.linearRampToValueAtTime(200, c.currentTime + 0.35)
  g.gain.setValueAtTime(0.15, c.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4)
  osc.start(); osc.stop(c.currentTime + 0.4)
  setTimeout(() => c.close(), 800)
}
