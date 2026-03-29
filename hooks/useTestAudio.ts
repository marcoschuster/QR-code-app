// hooks/useTestAudio.ts
import { useCallback, useRef } from 'react';
import { AudioPlayer, createAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

// Use the shared singleton player from useScanAudio
let sharedPlayer: AudioPlayer | null = null;

export function useTestAudio() {
  const playerRef = useRef<AudioPlayer | null>(null);

  // Use the same singleton player as useScanAudio
  if (!playerRef.current) {
    if (!sharedPlayer) {
      sharedPlayer = createAudioPlayer(require('../assets/sounds/scan-success.wav'));
    }
    playerRef.current = sharedPlayer;
  }

  const playTestSound = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const player = playerRef.current!;
      player.volume = 1.0;
      await player.seekTo(0);
      await player.play();
      
      console.log('🔊 Test sound played successfully');
      return true;
    } catch (error) {
      console.error('❌ Test sound failed:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return false;
    }
  }, []);

  return { playTestSound };
}
