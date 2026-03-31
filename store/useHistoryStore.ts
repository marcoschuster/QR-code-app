import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HistoryItem } from '../constants/types';

// crypto.randomUUID() doesn't exist in Hermes (React Native engine)
// This is a safe replacement that works everywhere
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

interface HistoryStore {
  items: HistoryItem[];
  addItem: (item: Omit<HistoryItem, 'id' | 'timestamp' | 'hours' | 'minutes' | 'groupId' | 'scanCount' | 'scanIds'>) => void;
  removeItem: (id: string) => void;
  removeScanId: (itemId: string, scanId: string) => void;
  clearAll: () => void;
  updateItem: (id: string, updates: Partial<HistoryItem>) => void;
  getItem: (id: string) => HistoryItem | undefined;
  getGroupedItems: () => HistoryItem[];
}

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        
        // Check if this QR code already exists
        const existingItem = get().items.find(i => i.rawValue === item.rawValue);
        
        if (existingItem) {
          // Update existing group
          const scanId = generateId();
          const updatedScanIds = [...(existingItem.scanIds || []), scanId];
          
          set((state) => ({
            items: state.items.map((i) => 
              i.id === existingItem.id 
                ? { 
                    ...i, 
                    scanCount: (i.scanCount || 1) + 1,
                    scanIds: updatedScanIds,
                    hours, 
                    minutes,
                    timestamp: Date.now()
                  }
                : i
            )
          }));
        } else {
          // Create new item
          const newItem: HistoryItem = {
            ...item,
            id: generateId(),
            timestamp: Date.now(),
            hours,
            minutes,
            groupId: item.rawValue, // Use rawValue as group ID for duplicates
            scanCount: 1,
            scanIds: [generateId()],
          };
          console.log('[History] addItem succeeded, id:', newItem.id);
          set((state) => ({ items: [newItem, ...state.items] }));
        }
      },
      removeItem: (id) => set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
      removeScanId: (itemId, scanId) => {
        set((state) => ({
          items: state.items.map((item) => 
            item.id === itemId && item.scanIds?.includes(scanId)
              ? {
                  ...item,
                  scanIds: item.scanIds.filter(id => id !== scanId),
                  scanCount: Math.max(0, (item.scanCount || 1) - 1),
                  // If no more scan IDs, remove the item entirely
                  ...(item.scanIds?.length === 1 ? {} : {})
                }
              : item
          )
        }));
      },
      clearAll: () => set({ items: [] }),
      updateItem: (id, updates) =>
        set((state) => ({
          items: state.items.map((i) => (i.id === id ? { ...i, ...updates } : i)),
        })),
      getItem: (id) => get().items.find((i) => i.id === id),
      getGroupedItems: () => {
        const items = get().items;
        // Group by groupId and sort by timestamp
        const grouped = items.reduce((acc, item) => {
          const groupId = item.groupId || item.id;
          if (!acc[groupId]) {
            acc[groupId] = [];
          }
          acc[groupId].push(item);
          return acc;
        }, {} as Record<string, HistoryItem[]>);
        
        // Get the latest item from each group
        return Object.values(grouped)
          .map(group => group.sort((a, b) => b.timestamp - a.timestamp)[0])
          .sort((a, b) => b.timestamp - a.timestamp);
      },
    }),
    { 
      name: 'qr-scanner-history',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
