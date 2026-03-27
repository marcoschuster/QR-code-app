// hooks/useTestAudio.ts
import { useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

export function useTestAudio() {
  // Use beep.wav which has actual content
  const player = useAudioPlayer(require('../assets/sounds/beep.wav'));

  const playTestSound = async () => {
    try {
      // Light haptic for button feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Set maximum volume
      player.volume = 1.0;
      
      // Seek to beginning and play
      await player.seekTo(0);
      await player.play();
      
      console.log('🔊 Test sound played successfully - Volume:', player.volume);
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
