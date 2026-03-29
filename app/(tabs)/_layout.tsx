import { Stack } from 'expo-router';
import React, { useEffect } from 'react';
import { preloadScanSound } from '../../hooks/useScanAudio';

export default function TabLayout() {
  // Preload audio immediately when app starts
  useEffect(() => {
    preloadScanSound();
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
