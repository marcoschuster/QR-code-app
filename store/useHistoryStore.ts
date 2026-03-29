import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HistoryItem } from '../constants/types';

// crypto.randomUUID() DOES NOT EXIST in React Native / Hermes engine
// Using this instead — works on all platforms
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

interface HistoryStore {
  items: HistoryItem[];
  addItem: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  removeItem: (id: string) => void;
  clearAll: () => void;
  updateItem: (id: string, updates: Partial<HistoryItem>) => void;
  getItem: (id: string) => HistoryItem | undefined;
}

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const newItem: HistoryItem = {
          ...item,
          id: generateId(),
          timestamp: Date.now(),
        };
        console.log('[History] addItem succeeded, id:', newItem.id);
        set((state) => ({ items: [newItem, ...state.items] }));
      },
      removeItem: (id) => set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
      clearAll: () => set({ items: [] }),
      updateItem: (id, updates) =>
        set((state) => ({
          items: state.items.map((i) => (i.id === id ? { ...i, ...updates } : i)),
        })),
      getItem: (id) => get().items.find((i) => i.id === id),
    }),
    { 
      name: 'qr-scanner-history',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
