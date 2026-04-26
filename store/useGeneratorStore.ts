import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GeneratorTemplateId } from '../services/generatorTemplates';

export interface GeneratorPreset {
  id: string;
  templateId: GeneratorTemplateId;
  templateTitle: string;
  summary: string;
  values: Record<string, string>;
  content: string;
  updatedAt: number;
}

interface GeneratorStore {
  recentPresets: GeneratorPreset[];
  savePreset: (preset: Omit<GeneratorPreset, 'id' | 'updatedAt'>) => void;
  removePreset: (id: string) => void;
  clearPresets: () => void;
}

const MAX_RECENT_PRESETS = 10;

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

export const useGeneratorStore = create<GeneratorStore>()(
  persist(
    (set) => ({
      recentPresets: [],
      savePreset: (preset) =>
        set((state) => {
          const existingPreset = state.recentPresets.find(
            (item) => item.templateId === preset.templateId && item.content === preset.content
          );

          const nextPreset: GeneratorPreset = existingPreset
            ? {
                ...existingPreset,
                ...preset,
                updatedAt: Date.now(),
              }
            : {
                ...preset,
                id: generateId(),
                updatedAt: Date.now(),
              };

          const remainingPresets = state.recentPresets.filter((item) => item.id !== nextPreset.id);

          return {
            recentPresets: [nextPreset, ...remainingPresets].slice(0, MAX_RECENT_PRESETS),
          };
        }),
      removePreset: (id) =>
        set((state) => ({
          recentPresets: state.recentPresets.filter((preset) => preset.id !== id),
        })),
      clearPresets: () => set({ recentPresets: [] }),
    }),
    {
      name: 'qr-scanner-generator',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
