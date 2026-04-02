import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  Alert,
  Image,
  Linking,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useHistoryStore } from '../../store/useHistoryStore';
import { HistoryItem, ThemeColors } from '../../constants/types';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Button } from './Button';

const getDomainFromUrl = (url: string) => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname;
  } catch {
    return null;
  }
};

const formatTime = (hours?: number, minutes?: number) => {
  if (hours !== undefined && minutes !== undefined) {
    const h = hours.toString().padStart(2, '0');
    const m = minutes.toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  return '';
};

const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength - 3) + '...';
};

const toTitleCase = (value: string) =>
  value
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const humanizeSegment = (value: string) =>
  value
    .replace(/[-_+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const looksLikeOpaqueId = (value: string) =>
  value.length > 10 && /^[a-zA-Z0-9_-]+$/.test(value) && !/[aeiou]/i.test(value);

const getSiteName = (hostname: string) => {
  const cleanHostname = hostname.replace(/^www\./i, '');
  const parts = cleanHostname.split('.');
  const domainIndex =
    parts.length > 2 && parts[parts.length - 2].length <= 3
      ? parts.length - 3
      : parts.length - 2;
  const domain = parts[Math.max(0, domainIndex)] || cleanHostname;

  return toTitleCase(humanizeSegment(domain));
};

const getUrlName = (url: string) => {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.replace(/^www\./i, '');

    if (/youtube\.com$/i.test(hostname) || /youtu\.be$/i.test(hostname)) {
      return 'YouTube Video';
    }

    const siteName = getSiteName(hostname);
    const segments = parsedUrl.pathname
      .split('/')
      .filter(Boolean)
      .map((segment) => humanizeSegment(decodeURIComponent(segment)));
    const lastSegment = segments[segments.length - 1];

    if (!lastSegment || looksLikeOpaqueId(lastSegment)) {
      return siteName || hostname;
    }

    return `${siteName} - ${toTitleCase(lastSegment)}`;
  } catch {
    return 'Website Link';
  }
};

const getHistoryItemName = (item: HistoryItem) => {
  if (item.name) {
    return item.name;
  }

  switch (item.type) {
    case 'url':
      return getUrlName(item.parsedData?.url || item.rawValue);
    case 'wifi':
      return item.parsedData?.ssid || 'Wi-Fi Network';
    case 'email':
      return item.parsedData?.email || 'Email Address';
    case 'phone':
      return item.parsedData?.phone || 'Phone Number';
    case 'sms':
      return item.parsedData?.phone ? `SMS to ${item.parsedData.phone}` : 'SMS Message';
    case 'vcard': {
      const fullName = [item.parsedData?.firstName, item.parsedData?.lastName]
        .filter(Boolean)
        .join(' ')
        .trim();
      return fullName || item.parsedData?.company || 'Contact Card';
    }
    case 'location':
      return 'Map Location';
    case 'barcode':
      return 'Barcode';
    case 'text':
    default:
      return truncateText(item.rawValue, 48);
  }
};

const getHistoryPrimaryAction = (item: HistoryItem) => {
  switch (item.type) {
    case 'url':
      return { title: 'Open Link', icon: 'globe-outline' as const };
    case 'phone':
      return { title: 'Call Number', icon: 'call-outline' as const };
    case 'email':
      return { title: 'Send Email', icon: 'mail-outline' as const };
    case 'sms':
      return { title: 'Send SMS', icon: 'chatbubble-outline' as const };
    case 'location':
      return { title: 'Open Map', icon: 'location-outline' as const };
    default:
      return null;
  }
};

interface HistoryScreenProps {
  onTabBarVisibilityChange?: (hidden: boolean) => void;
}

export function HistoryScreen({ onTabBarVisibilityChange }: HistoryScreenProps) {
  const { clearAll, removeItem, removeScanId, getGroupedItems, updateItem } = useHistoryStore();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingNameValue, setEditingNameValue] = useState('');
  const { theme, isDark } = useAppTheme();
  const lastScrollY = useRef(0);
  const tabBarHidden = useRef(false);
  const groupedItems = getGroupedItems();
  const primaryAction = selectedItem ? getHistoryPrimaryAction(selectedItem) : null;

  useEffect(() => {
    if (selectedItem) {
      setIsEditingName(false);
      setEditingNameValue(selectedItem.name || getHistoryItemName(selectedItem));
    }
  }, [selectedItem]);

  const handleSaveName = () => {
    if (selectedItem) {
      const trimmedName = editingNameValue.trim();
      updateItem(selectedItem.id, { name: trimmedName || undefined });
      setSelectedItem({ ...selectedItem, name: trimmedName || undefined });
      setIsEditingName(false);
    }
  };

  const setTabBarHidden = useCallback((hidden: boolean) => {
    if (tabBarHidden.current === hidden) {
      return;
    }

    tabBarHidden.current = hidden;
    onTabBarVisibilityChange?.(hidden);
  }, [onTabBarVisibilityChange]);

  useEffect(() => {
    setTabBarHidden(false);

    return () => {
      onTabBarVisibilityChange?.(false);
    };
  }, [onTabBarVisibilityChange, setTabBarHidden]);

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
    setExpandedItems((prev) => {
      const next = new Set(prev);

      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }

      return next;
    });
  };

  const handleScroll = ({ nativeEvent }: { nativeEvent: { contentOffset: { y: number } } }) => {
    const currentY = nativeEvent.contentOffset.y;
    const deltaY = currentY - lastScrollY.current;

    if (currentY <= 16) {
      setTabBarHidden(false);
    } else if (deltaY > 10) {
      setTabBarHidden(true);
    } else if (deltaY < -10) {
      setTabBarHidden(false);
    }

    lastScrollY.current = currentY;
  };

  const handleCopySelectedItem = async () => {
    if (!selectedItem) {
      return;
    }

    await Clipboard.setStringAsync(selectedItem.rawValue);
    Alert.alert(
      selectedItem.type === 'url' ? 'Link copied' : 'Copied',
      selectedItem.type === 'url'
        ? 'The scanned link has been copied to your clipboard.'
        : 'The scanned content has been copied to your clipboard.'
    );
  };

  const handleOpenSelectedItem = async () => {
    if (!selectedItem) {
      return;
    }

    switch (selectedItem.type) {
      case 'url':
        await WebBrowser.openBrowserAsync(selectedItem.parsedData?.url || selectedItem.rawValue);
        return;
      case 'phone':
        await Linking.openURL(`tel:${selectedItem.parsedData?.phone || selectedItem.rawValue.replace(/^tel:/, '')}`);
        return;
      case 'email': {
        const email = selectedItem.parsedData?.email || '';
        const subject = selectedItem.parsedData?.subject || '';
        const body = selectedItem.parsedData?.body || '';
        const mailto = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

        await Linking.openURL(mailto);
        return;
      }
      case 'sms': {
        const phone = selectedItem.parsedData?.phone || '';
        const body = selectedItem.parsedData?.body || '';
        const sms = body ? `sms:${phone}?body=${encodeURIComponent(body)}` : `sms:${phone}`;

        await Linking.openURL(sms);
        return;
      }
      case 'location': {
        const latitude = selectedItem.parsedData?.latitude;
        const longitude = selectedItem.parsedData?.longitude;

        if (typeof latitude === 'number' && typeof longitude === 'number') {
          await WebBrowser.openBrowserAsync(`https://maps.google.com/?q=${latitude},${longitude}`);
        }
        return;
      }
      default:
        return;
    }
  };

  if (!groupedItems.length) {
    return (
      <View style={[s.container, { backgroundColor: theme.background }]}>
        <View style={[s.header, { borderBottomColor: theme.border }]}>
          <Text style={[s.headerTitle, { color: theme.text.primary }]}>History</Text>
        </View>
        <View style={s.empty}>
          <Text style={s.emptyIcon}>📋</Text>
          <Text style={[s.emptyTitle, { color: theme.text.primary }]}>No scans yet</Text>
          <Text style={[s.emptySubtitle, { color: theme.text.secondary }]}>
            Your scan history will appear here
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      <View style={[s.header, { borderBottomColor: theme.border }]}>
        <Text style={[s.headerTitle, { color: theme.text.primary }]}>History</Text>
        <Pressable onPress={handleClearAll}>
          <Text style={[s.clearBtn, { color: theme.danger }]}>Clear All</Text>
        </Pressable>
      </View>

      <FlatList
        data={groupedItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.listContent}
        onScroll={handleScroll}
        renderItem={({ item }) => (
          <HistoryItemComponent
            item={item}
            isExpanded={expandedItems.has(item.id)}
            onToggleExpanded={() => toggleExpanded(item.id)}
            onRemoveItem={handleRemoveItem}
            onRemoveScan={handleRemoveScan}
            onPress={() => setSelectedItem(item)}
            theme={theme}
            isDark={isDark}
          />
        )}
        scrollEventThrottle={16}
      />

      {selectedItem && (
        <Modal
          visible
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setSelectedItem(null)}
        >
          <View style={[s.modalContainer, { backgroundColor: theme.background }]}>
            <View
              style={[
                s.modalHeader,
                {
                  backgroundColor: theme.surface,
                  borderBottomColor: theme.border,
                },
              ]}
            >
              <Pressable onPress={() => setSelectedItem(null)}>
                <Ionicons name="close" size={24} color={theme.accent} />
              </Pressable>
              <Text style={[s.modalTitle, { color: theme.text.primary }]}>Scan Details</Text>
              <View style={s.modalSpacer} />
            </View>

            <ScrollView style={s.modalContent}>
              <View style={[s.detailCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={s.detailHeaderRow}>
                  <Text style={[s.detailLabel, { color: theme.text.secondary }]}>Name</Text>
                  <Pressable onPress={() => isEditingName ? handleSaveName() : setIsEditingName(true)}>
                    <Ionicons 
                      name={isEditingName ? "checkmark-circle-outline" : "create-outline"} 
                      size={20} 
                      color={theme.accent} 
                    />
                  </Pressable>
                </View>
                {isEditingName ? (
                  <TextInput
                    style={[s.editInput, { color: theme.text.primary, borderBottomColor: theme.accent }]}
                    value={editingNameValue}
                    onChangeText={setEditingNameValue}
                    autoFocus
                    onSubmitEditing={handleSaveName}
                    returnKeyType="done"
                    placeholder="Enter a name..."
                    placeholderTextColor={theme.text.tertiary}
                  />
                ) : (
                  <Text style={[s.detailValue, { color: theme.text.primary }]}>
                    {getHistoryItemName(selectedItem)}
                  </Text>
                )}
              </View>
              <DetailCard label="Type" value={selectedItem.type.toUpperCase()} theme={theme} />
              <DetailCard
                label={selectedItem.type === 'url' ? 'Link' : 'Content'}
                value={selectedItem.rawValue}
                theme={theme}
              />
              <DetailCard
                label="Scanned"
                value={`${new Date(selectedItem.timestamp).toLocaleDateString()} at ${formatTime(selectedItem.hours, selectedItem.minutes)}`}
                theme={theme}
              />
              {selectedItem.scanCount && selectedItem.scanCount > 1 ? (
                <DetailCard label="Scan Count" value={`${selectedItem.scanCount} times`} theme={theme} />
              ) : null}
            </ScrollView>

            <View
              style={[
                s.modalActions,
                {
                  backgroundColor: theme.surface,
                  borderTopColor: theme.border,
                },
              ]}
            >
              <View style={s.modalActionRow}>
                {primaryAction ? (
                  <View style={s.modalActionButton}>
                    <Button
                      title={primaryAction.title}
                      onPress={handleOpenSelectedItem}
                      icon={
                        <Ionicons
                          name={primaryAction.icon}
                          size={20}
                          color="#FFFFFF"
                        />
                      }
                    />
                  </View>
                ) : null}
                <View style={s.modalActionButton}>
                  <Button
                    title={selectedItem.type === 'url' ? 'Copy Link' : 'Copy Content'}
                    onPress={handleCopySelectedItem}
                    variant={primaryAction ? 'secondary' : 'primary'}
                    icon={
                      <Ionicons
                        name="copy-outline"
                        size={20}
                        color={primaryAction ? theme.text.primary : '#FFFFFF'}
                      />
                    }
                  />
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

function DetailCard({ label, value, theme }: { label: string; value: string; theme: ThemeColors }) {
  return (
    <View
      style={[
        s.detailCard,
        {
          backgroundColor: theme.surface,
          shadowColor: theme.shadow,
          borderColor: theme.border,
        },
      ]}
    >
      <Text style={[s.detailLabel, { color: theme.text.secondary }]}>{label}</Text>
      <Text style={[s.detailValue, { color: theme.text.primary }]}>{value}</Text>
    </View>
  );
}

function HistoryItemComponent({
  item,
  isExpanded,
  onToggleExpanded,
  onRemoveItem,
  onRemoveScan,
  onPress,
  theme,
  isDark,
}: {
  item: HistoryItem;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onRemoveItem: (id: string) => void;
  onRemoveScan: (itemId: string, scanId: string) => void;
  onPress: () => void;
  theme: ThemeColors;
  isDark: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  const domain = getDomainFromUrl(item.rawValue);
  const isGrouped = (item.scanCount || 0) > 1;

  return (
    <View
      style={[
        s.historyCard,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          shadowColor: theme.shadow,
        },
      ]}
    >
      <Pressable style={s.cardContent} onPress={onPress}>
        <View style={[s.iconContainer, { backgroundColor: theme.background }]}>
          {domain && !imgError ? (
            <Image
              source={{ uri: `https://www.google.com/s2/favicons?domain=${domain}&sz=128` }}
              style={s.logoImage}
              onError={() => setImgError(true)}
              resizeMode="contain"
            />
          ) : (
            <Ionicons name="link" size={20} color={theme.text.secondary} />
          )}
        </View>

        <View style={s.textContainer}>
          <View style={s.headerRow}>
            <Text style={[s.dataText, { color: theme.text.primary }]}>
              {item.name || truncateText(item.rawValue, 25)}
            </Text>
            {isGrouped ? (
              <View style={[s.scanCount, { backgroundColor: theme.accent }]}>
                <Text style={s.scanCountText}>{item.scanCount}</Text>
              </View>
            ) : null}
          </View>
          <Text style={[s.dateText, { color: theme.text.secondary }]}>
            {new Date(item.timestamp).toLocaleDateString()} at {formatTime(item.hours, item.minutes)}
          </Text>
        </View>

        <View style={s.inlineActions}>
          {isGrouped ? (
            <Pressable style={s.expandBtn} onPress={onToggleExpanded}>
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={theme.accent}
              />
            </Pressable>
          ) : null}
          <Pressable style={s.deleteBtn} onPress={() => onRemoveItem(item.id)}>
            <Ionicons name="trash-outline" size={16} color={theme.danger} />
          </Pressable>
        </View>
      </Pressable>

      {isExpanded && isGrouped && item.scanIds ? (
        <View
          style={[
            s.expandedContent,
            { backgroundColor: isDark ? '#090909' : '#FAFAFB' },
          ]}
        >
          <Text style={[s.expandedTitle, { color: theme.text.primary }]}>Individual Scans:</Text>
          {item.scanIds.map((scanId, index) => (
            <View key={scanId} style={s.scanItem}>
              <View style={s.scanInfo}>
                <Text style={[s.scanIndex, { color: theme.accent }]}>Scan #{index + 1}</Text>
                <Text style={[s.scanTime, { color: theme.text.secondary }]}>
                  {new Date(item.timestamp - (item.scanIds!.length - index - 1) * 1000).toLocaleTimeString()}
                </Text>
              </View>
              <Pressable style={s.deleteScanBtn} onPress={() => onRemoveScan(item.id, scanId)}>
                <Ionicons name="trash-outline" size={16} color={theme.danger} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  clearBtn: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 140,
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
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  historyCard: {
    marginHorizontal: 20,
    marginVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
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
    flex: 1,
  },
  scanCount: {
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
    marginTop: 2,
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  expandedTitle: {
    fontSize: 13,
    fontWeight: '600',
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
  },
  scanTime: {
    fontSize: 11,
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
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalSpacer: {
    width: 24,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalActions: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalActionButton: {
    flex: 1,
  },
  detailCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  detailHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  editInput: {
    fontSize: 15,
    paddingVertical: 4,
    borderBottomWidth: 1,
  },
  detailValue: {
    fontSize: 15,
    lineHeight: 20,
  },
});
