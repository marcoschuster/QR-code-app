// hooks/useScanAudio.ts
import { useCallback } from 'react';
import { useAudioPlayer } from 'expo-audio';
import { useSettingsStore } from '../store/useSettingsStore';

export function useScanAudio() {
  const beepOnScan = useSettingsStore((state) => state.beepOnScan);
  
  // Use the new scan-success.wav with satisfying tone
  const player = useAudioPlayer(require('../assets/sounds/scan-success.wav'));

  const playScanSound = useCallback(async () => {
    if (!beepOnScan) return;
    
    try {
      // Set maximum volume
      player.volume = 1.0;
      
      // Seek to beginning and play
      await player.seekTo(0);
      await player.play();
      console.log('🔊 Scan sound played - Volume:', player.volume);
    } catch (error) {
      console.error('❌ Scan sound failed:', error);
    }
  }, [beepOnScan, player]);

  return { playScanSound };
}
