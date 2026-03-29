import { useCallback, useRef } from 'react';
import { AudioPlayer, createAudioPlayer } from 'expo-audio';
import { useSettingsStore } from '../store/useSettingsStore';

// SINGLETON - one shared player instance across entire app
let sharedPlayer: AudioPlayer | null = null;
let isPreloaded = false;

function getOrCreatePlayer(): AudioPlayer {
  if (!sharedPlayer) {
    sharedPlayer = createAudioPlayer(require('../assets/sounds/scan-success.wav'));
  }
  return sharedPlayer;
}

export async function preloadScanSound() {
  if (isPreloaded) return;  
  try {
    const player = getOrCreatePlayer();

    // Silent prime — forces the audio subsystem to decode + buffer the file
    player.volume = 0;
    await player.seekTo(0);
    await player.play();

    // Wait long enough for a short WAV to fully play through internally
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Park player in a known idle state so the first real play is instant
    try { player.pause(); } catch (_) {}
    isPreloaded = true;
    console.log('🔊 Audio preloaded successfully');
  } catch (e) {
    console.log('Audio preload error:', e);
  }
}

export function useScanAudio() {
  const beepOnScan = useSettingsStore((state) => state.beepOnScan);
  const playerRef = useRef<AudioPlayer | null>(null);

  // Use the shared singleton player
  if (!playerRef.current) {
    if (!sharedPlayer) {
      sharedPlayer = createAudioPlayer(require('../assets/sounds/scan-success.wav'));
    }
    playerRef.current = sharedPlayer;
  }

  const playScanSound = useCallback(async () => {
    if (!beepOnScan) return;
    
    const player = playerRef.current!;
    
    try {
      player.volume = 1.0;
      await player.seekTo(0);
      await player.play();
      console.log('🔊 Scan sound played');
    } catch (error) {
      console.error('❌ Scan sound failed:', error);
    }
  }, [beepOnScan]);

  return { playScanSound };
}
