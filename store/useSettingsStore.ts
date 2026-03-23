import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppearanceMode, SettingsState } from '../constants/types';

const defaultSettings: SettingsState = {
  appearance: 'system',
  autoOpenUrls: false,
  saveToHistory: true,
  vibrateOnScan: true,
  beepOnScan: false,
  urlThreatScanning: true,
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
    }
  )
);
