import { createAudioPlayer, AudioPlayer } from 'expo-audio';

// THE one and only player instance for the entire app
let _player: AudioPlayer | null = null;
let _primed = false;
let _busy = false;

export function getSharedPlayer(): AudioPlayer {
  if (!_player) {
    _player = createAudioPlayer(require('../assets/sounds/scan-success.wav'));
  }
  return _player;
}

export async function primeAudio(): Promise<void> {
  // Always re-prime — caller decides when to call this
  _primed = false;
  const p = getSharedPlayer();
  try {
    p.volume = 0;
    p.play();
    await new Promise(r => setTimeout(r, 700));
    p.pause();
    await new Promise(r => setTimeout(r, 150));
    _primed = true;
    console.log('[audio] primed OK');
  } catch (e) {
    console.warn('[audio] prime failed:', e);
  }
}

export async function playAudio(): Promise<void> {
  if (_busy) return;
  _busy = true;
  const p = getSharedPlayer();
  try {
    p.volume = 1.0;
    // DO NOT seekTo before play — it is not reliably awaitable on Android.
    // Instead: destroy old player and create a fresh one at position 0.
    // A fresh player always starts at 0.
    _player = createAudioPlayer(require('../assets/sounds/scan-success.wav'));
    _player.volume = 1.0;
    _player.play();
    console.log('[audio] played');
  } catch (e) {
    console.error('[audio] play failed:', e);
  } finally {
    setTimeout(() => { _busy = false; }, 500);
  }
}
