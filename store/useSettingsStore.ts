import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppearanceMode, SettingsState } from '../constants/types';

const defaultSettings: SettingsState = {
  appearance: 'system',
  autoOpenUrls: false,
  saveToHistory: true,
  vibrateOnScan: true,
  beepOnScan: false,
  urlThreatScanning: true,
  confirmDeleteHistory: true,
  autoCopyScanned: false,
  swipeNavigation: true,
  defaultErrorCorrection: 'M',
  defaultOutputFormat: 'QR',
};

interface SettingsStore extends SettingsState {
  updateSettings: (updates: Partial<SettingsState>) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...defaultSettings,
      updateSettings: (updates) =>
        set((state) => ({ ...state, ...updates })),
      resetSettings: () => set(defaultSettings),
    }),
    {
      name: 'qr-scanner-settings',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          // Migration from version 0 to 1: ensure all fields exist
          return {
            ...defaultSettings,
            ...persistedState,
          };
        }
        // Always merge with defaults to ensure new fields are present
        return {
          ...defaultSettings,
          ...persistedState,
        };
      },
    }
  )
);
