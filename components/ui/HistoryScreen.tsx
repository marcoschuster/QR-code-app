import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  Alert,
  Image,
  Modal,
  ScrollView,
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

// Format time display
const formatTime = (hours?: number, minutes?: number) => {
  if (hours !== undefined && minutes !== undefined) {
    const h = hours.toString().padStart(2, '0');
    const m = minutes.toString().padStart(2, '0');
    return `${h}:${m}`;
  }
  return '';
};

// Truncate text with ellipsis
const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

export function HistoryScreen() {
  const { items, clearAll, removeItem, removeScanId, getGroupedItems } = useHistoryStore();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  // Use grouped items to show duplicates merged
  const groupedItems = getGroupedItems();

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

  const handleRemoveScan = (itemId: string, scanId: string) => {
    Alert.alert('Delete Scan', 'Remove this individual scan from history?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeScanId(itemId, scanId) },
    ]);
  };

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  if (!groupedItems || groupedItems.length === 0) {
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
        data={groupedItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => (
          <HistoryItemComponent 
            item={item} 
            isExpanded={expandedItems.has(item.id)}
            onToggleExpanded={() => toggleExpanded(item.id)}
            onRemoveItem={handleRemoveItem}
            onRemoveScan={handleRemoveScan}
            onPress={() => setSelectedItem(item)}
          />
        )}
        ItemSeparatorComponent={() => <View style={s.separator} />}
      />

      {/* Full Details Modal */}
      {selectedItem && (
        <Modal
          visible={!!selectedItem}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setSelectedItem(null)}
        >
          <View style={s.modalContainer}>
            <View style={s.modalHeader}>
              <Pressable onPress={() => setSelectedItem(null)}>
                <Ionicons name="close" size={24} color="#007AFF" />
              </Pressable>
              <Text style={s.modalTitle}>QR Code Details</Text>
              <View style={s.modalSpacer} />
            </View>
            
            <ScrollView style={s.modalContent}>
              <View style={s.detailCard}>
                <Text style={s.detailLabel}>Type</Text>
                <Text style={s.detailValue}>{selectedItem.type.toUpperCase()}</Text>
              </View>
              
              <View style={s.detailCard}>
                <Text style={s.detailLabel}>Content</Text>
                <Text style={s.detailValue}>{selectedItem.rawValue}</Text>
              </View>
              
              <View style={s.detailCard}>
                <Text style={s.detailLabel}>Scanned</Text>
                <Text style={s.detailValue}>
                  {new Date(selectedItem.timestamp).toLocaleDateString()} at {formatTime(selectedItem.hours, selectedItem.minutes)}
                </Text>
              </View>
              
              {selectedItem.scanCount && selectedItem.scanCount > 1 && (
                <View style={s.detailCard}>
                  <Text style={s.detailLabel}>Scan Count</Text>
                  <Text style={s.detailValue}>{selectedItem.scanCount} times</Text>
                </View>
              )}
              
              {selectedItem.parsedData && Object.keys(selectedItem.parsedData).length > 0 && (
                <View style={s.detailCard}>
                  <Text style={s.detailLabel}>Parsed Data</Text>
                  <Text style={s.detailValue}>{JSON.stringify(selectedItem.parsedData, null, 2)}</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </Modal>
      )}
    </View>
  );
}

const HistoryItemComponent = ({ 
  item, 
  isExpanded, 
  onToggleExpanded, 
  onRemoveItem, 
  onRemoveScan,
  onPress
}: { 
  item: HistoryItem; 
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onRemoveItem: (id: string) => void;
  onRemoveScan: (itemId: string, scanId: string) => void;
  onPress: () => void;
}) => {
  const [imgError, setImgError] = useState(false);
  const domain = getDomainFromUrl(item.rawValue);
  const isGrouped = item.scanCount && item.scanCount > 1;

  return (
    <View style={s.historyCard}>
      <Pressable style={s.cardContent} onPress={onPress}>
        <View style={s.iconContainer}>
          {domain && !imgError ? (
            <Image 
              source={{ uri: `https://www.google.com/s2/favicons?domain=${domain}&sz=128` }}
              style={s.logoImage}
              onError={() => setImgError(true)}
              resizeMode="contain"
            />
          ) : (
            <Ionicons name="link" size={20} color="#555" />
          )}
        </View>
        
        <View style={s.textContainer}>
          <View style={s.headerRow}>
            <Text style={s.dataText}>
              {truncateText(item.rawValue, 25)}
            </Text>
            {isGrouped && (
              <View style={s.scanCount}>
                <Text style={s.scanCountText}>{item.scanCount}</Text>
              </View>
            )}
          </View>
          <Text style={s.dateText}>
            {new Date(item.timestamp).toLocaleDateString()} at {formatTime(item.hours, item.minutes)}
          </Text>
        </View>

        {/* Inline action buttons */}
        <View style={s.inlineActions}>
          {isGrouped && (
            <Pressable style={s.expandBtn} onPress={onToggleExpanded}>
              <Ionicons 
                name={isExpanded ? "chevron-up" : "chevron-down"} 
                size={16} 
                color="#007AFF" 
              />
            </Pressable>
          )}
          <Pressable style={s.deleteBtn} onPress={() => onRemoveItem(item.id)}>
            <Ionicons name="trash-outline" size={16} color="#FF3B30" />
          </Pressable>
        </View>
      </Pressable>

      {/* Expandable scan details */}
      {isExpanded && isGrouped && item.scanIds && (
        <View style={s.expandedContent}>
          <Text style={s.expandedTitle}>Individual Scans:</Text>
          {item.scanIds.map((scanId, index) => (
            <View key={scanId} style={s.scanItem}>
              <View style={s.scanInfo}>
                <Text style={s.scanIndex}>Scan #{index + 1}</Text>
                <Text style={s.scanTime}>
                  {new Date(item.timestamp - (item.scanIds!.length - index - 1) * 1000).toLocaleTimeString()}
                </Text>
              </View>
              <Pressable 
                style={s.deleteScanBtn} 
                onPress={() => onRemoveScan(item.id, scanId)}
              >
                <Ionicons name="trash-outline" size={16} color="#FF3B30" />
              </Pressable>
            </View>
          ))}
        </View>
      )}
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
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoImage: {
    width: 20,
    height: 20,
  },
  textContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dataText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
    flex: 1,
  },
  scanCount: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
    marginLeft: 8,
  },
  scanCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF',
  },
  dateText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  expandedContent: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  expandedTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  scanItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  scanInfo: {
    flex: 1,
  },
  scanIndex: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  scanTime: {
    fontSize: 11,
    color: '#666',
  },
  deleteScanBtn: {
    padding: 6,
    borderRadius: 4,
  },
  inlineActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expandBtn: {
    padding: 6,
    borderRadius: 4,
  },
  deleteBtn: {
    padding: 6,
    borderRadius: 4,
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginHorizontal: 20,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  modalSpacer: {
    width: 24,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  detailCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 15,
    color: '#000',
    lineHeight: 20,
  },
});
