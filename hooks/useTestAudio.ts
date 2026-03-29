// hooks/useTestAudio.ts
import { useCallback, useRef } from 'react';
import { AudioPlayer, createAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

// Use the shared singleton player from useScanAudio
let sharedPlayer: AudioPlayer | null = null;

export function useTestAudio() {
  const player = useAudioPlayer(require('../assets/sounds/scan-success.mp3'));

  const playTestSound = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await player.seekTo(0);
      await player.play();
      console.log('[Audio] Test sound played successfully');
      return true;
    } catch (error) {
      console.error('[Audio] Test sound failed:', error);
      // Fallback to haptic only
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return false;
    }
  }, []);

  return { playTestSound };
}
