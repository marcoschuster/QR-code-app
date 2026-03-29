import { useCallback } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { primeAudio, playAudio } from './audioPlayer';

// Re-export so _layout.tsx import still works without changes
export { primeAudio as preloadScanSound };

export function useScanAudio() {
  const beepOnScan = useSettingsStore((state) => state.beepOnScan);

  const playScanSound = useCallback(async () => {
    if (!beepOnScan) return;
    await playAudio();
  }, [beepOnScan]);

  return { playScanSound };
}
