import { Stack } from 'expo-router';
import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { primeAudio as preloadScanSound } from '../hooks/audioPlayer';

export default function RootLayout() {
  useEffect(() => {
    preloadScanSound();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        preloadScanSound();
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen 
        name="settings" 
        options={{ 
          presentation: 'card',
          headerShown: false,
        }} 
      />
    </Stack>
  );
}
