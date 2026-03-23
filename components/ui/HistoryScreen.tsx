import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHistoryStore } from '../../store/useHistoryStore';

const TYPE_ICONS: Record<string, string> = {
  url: '🔗',
  wifi: '📶',
  email: '📧',
  phone: '📱',
  location: '📍',
  text: '📄',
  barcode: '🛒',
  sms: '💬',
  vcard: '👤',
};

export function HistoryScreen() {
  const { items, clearAll, removeItem } = useHistoryStore();

  const handleClearAll = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to delete all scan history?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: clearAll },
      ]
    );
  };

  const handleRemoveItem = (id: string) => {
    Alert.alert('Delete', 'Remove this item from history?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeItem(id) },
    ]);
  };

  if (!items || items.length === 0) {
    return (
      <View style={s.container}>
        <View style={s.header}>
          <Text style={s.headerTitle}>History</Text>
        </View>
        <View style={s.empty}>
          <Text style={s.emptyIcon}>📋</Text>
          <Text style={s.emptyTitle}>No scans yet</Text>
          <Text style={s.emptySubtitle}>
            Your scan history will appear here
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>History</Text>
        <Pressable onPress={handleClearAll}>
          <Text style={s.clearBtn}>Clear All</Text>
        </Pressable>
      </View>

      <FlatList
        data={[...items].reverse()} // newest first
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => (
          <Pressable
            style={s.item}
            onLongPress={() => handleRemoveItem(item.id)}
          >
            <Text style={s.icon}>{TYPE_ICONS[item.type] ?? '📋'}</Text>
            <View style={s.itemContent}>
              <Text style={s.itemType}>{item.type?.toUpperCase() ?? 'SCAN'}</Text>
              <Text style={s.itemValue} numberOfLines={2}>
                {item.rawValue}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#888" />
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={s.separator} />}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    letterSpacing: -0.5,
  },
  clearBtn: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '500',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    backgroundColor: '#FFF',
  },
  icon: { fontSize: 24, width: 32, textAlign: 'center' },
  itemContent: { flex: 1 },
  itemType: { 
    fontSize: 11, 
    fontWeight: '600', 
    letterSpacing: 0.5, 
    marginBottom: 2,
    color: '#666',
  },
  itemValue: { 
    fontSize: 14, 
    lineHeight: 20,
    color: '#000',
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E5EA',
  },
});
