// So i vibració per al final del descans.
// iPhone (Safari) no admet navigator.vibrate, per això també fem un so i un avís visual.

let ctx: AudioContext | null = null;

/** S'ha de cridar des d'un gest de l'usuari (iOS només deixa sonar l'àudio així) */
export function unlockAudio() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!ctx && AC) ctx = new AC();
    if (ctx?.state === 'suspended') void ctx.resume();
    // so silenciós per "desbloquejar" a iOS
    if (ctx) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      g.gain.value = 0;
      o.connect(g).connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + 0.01);
    }
  } catch { /* ignore */ }
}

export function beep(times = 3) {
  try {
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();
    for (let i = 0; i < times; i++) {
      const t = ctx.currentTime + i * 0.28;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = i === times - 1 ? 1320 : 880;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.4, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      o.connect(g).connect(ctx.destination);
      o.start(t); o.stop(t + 0.25);
    }
  } catch { /* ignore */ }
}

export function vibrate(pattern: number | number[] = [300, 150, 300]) {
  try { navigator.vibrate?.(pattern); } catch { /* ignore */ }
}

/** Manté la pantalla encesa durant l'entrenament (si el navegador ho permet) */
let wakeLock: WakeLockSentinel | null = null;
export async function keepAwake(on: boolean) {
  try {
    if (on && !wakeLock && 'wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } else if (!on && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch { /* ignore */ }
}
