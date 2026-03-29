// hooks/useTestAudio.ts
import { useRef } from 'react';
import { AudioPlayer, createAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

// Use the shared singleton player from useScanAudio
let sharedPlayer: AudioPlayer | null = null;

function getOrCreatePlayer(): AudioPlayer {
  if (!sharedPlayer) {
    sharedPlayer = createAudioPlayer(require('../assets/sounds/scan-success.wav'));
  }
  return sharedPlayer;
}

export function useTestAudio() {
  const playerRef = useRef<AudioPlayer | null>(null);

  // Use the shared singleton player
  if (!playerRef.current) {
    playerRef.current = getOrCreatePlayer();
  }

  const playTestSound = async () => {
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
      
      // Fallback to haptic notification
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return false;
    }
  };

  return { playTestSound };
}
