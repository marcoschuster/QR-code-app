import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { playAudio } from './audioPlayer';

export function useTestAudio() {
  const playTestSound = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await playAudio();
  }, []);

  return { playTestSound };
}
