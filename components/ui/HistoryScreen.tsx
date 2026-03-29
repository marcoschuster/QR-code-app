import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHistoryStore } from '../../store/useHistoryStore';
import { HistoryItem } from '../../constants/types';

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

// Helper to extract domain from URL
const getDomainFromUrl = (url: string) => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname;
  } catch (e) {
    return null;
  }
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
          <HistoryItemComponent item={item} />
        )}
        ItemSeparatorComponent={() => <View style={s.separator} />}
      />
    </View>
  );
}

const HistoryItemComponent = ({ item }: { item: HistoryItem }) => {
  const [imgError, setImgError] = useState(false);
  const domain = getDomainFromUrl(item.rawValue);

  return (
    <View style={s.historyCard}>
      <View style={s.iconContainer}>
        {domain && !imgError ? (
          <Image 
            source={{ uri: `https://www.google.com/s2/favicons?domain=${domain}&sz=128` }}
            style={s.logoImage}
            onError={() => setImgError(true)}
            resizeMode="contain"
          />
        ) : (
          <Ionicons name="link" size={24} color="#555" />
        )}
      </View>
      <View style={s.textContainer}>
        <Text style={s.dataText} numberOfLines={1}>{item.rawValue}</Text>
        <Text style={s.dateText}>{new Date(item.timestamp).toLocaleDateString()}</Text>
      </View>
    </View>
  );
};

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
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    backgroundColor: '#FFF',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: 24,
    height: 24,
  },
  textContainer: {
    flex: 1,
  },
  dataText: {
    fontSize: 14,
    color: '#000',
  },
  dateText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E5EA',
  },
});
