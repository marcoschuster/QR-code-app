import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  Image,
  Linking,
  Modal,
  Animated,
  Easing,
  TextInput,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useHistoryStore } from '../../store/useHistoryStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { HistoryItem, ThemeColors } from '../../constants/types';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Button } from './Button';
import { Card } from './Card';
import { ConfirmDialog } from './ConfirmDialog';
import { LiquidGlassSurface } from './LiquidGlassSurface';
import { SuccessDialog } from './SuccessDialog';

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

const getHistoryPreviewUrl = (url: string, maxLength = 30) =>
  truncateText(url.replace(/^https?:\/\//i, ''), maxLength);

const getLocationDisplayValue = (parsedData: Record<string, any>) => {
  if (parsedData?.query) {
    return parsedData.query;
  }

  if (
    typeof parsedData?.latitude === 'number' &&
    typeof parsedData?.longitude === 'number'
  ) {
    return `${parsedData.latitude}, ${parsedData.longitude}`;
  }

  return 'Map Location';
};

const getHistoryItemContentValue = (item: HistoryItem) => {
  switch (item.type) {
    case 'sms':
      return item.parsedData?.body
        ? `SMS to ${item.parsedData.phone}\n${item.parsedData.body}`
        : `SMS to ${item.parsedData?.phone || ''}`.trim();
    case 'whatsapp':
      return [
        item.parsedData?.phone ? `WhatsApp: ${item.parsedData.phone}` : '',
        item.parsedData?.message ? `Message: ${item.parsedData.message}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    case 'phone':
      return item.parsedData?.phone || item.rawValue.replace(/^tel:/i, '');
    case 'coupon':
      return [
        item.parsedData?.title ? `Offer: ${item.parsedData.title}` : '',
        item.parsedData?.code ? `Code: ${item.parsedData.code}` : '',
        item.parsedData?.details ? `Details: ${item.parsedData.details}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    case 'location':
      return getLocationDisplayValue(item.parsedData);
    case 'calendar':
      return [
        item.parsedData?.title || 'Calendar Event',
        item.parsedData?.start ? `Start: ${item.parsedData.start}` : '',
        item.parsedData?.end ? `End: ${item.parsedData.end}` : '',
        item.parsedData?.location ? `Location: ${item.parsedData.location}` : '',
        item.parsedData?.description ? `Description: ${item.parsedData.description}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    default:
      return item.rawValue;
  }
};

const getDetailTypeLabel = (type: HistoryItem['type']) => {
  switch (type) {
    case 'vcard':
      return 'CONTACT';
    case 'calendar':
      return 'CALENDAR EVENT';
    case 'play-store':
      return 'GOOGLE PLAY STORE';
    case 'app-store':
      return 'APP STORE';
    case 'whatsapp':
      return 'WHATSAPP';
    case 'coupon':
      return 'COUPON';
    default:
      return type.toUpperCase();
  }
};

const escapeCsvValue = (value: string) => `"${value.replace(/"/g, '""')}"`;

const getHistoryItemCsv = (item: HistoryItem) => {
  const columns = ['Title', 'Type', 'Content', 'Scanned At', 'Scan Count'];
  const values = [
    getHistoryItemName(item),
    item.type.toUpperCase(),
    item.rawValue,
    new Date(item.timestamp).toISOString(),
    String(item.scanCount || 1),
  ];

  return `${columns.map(escapeCsvValue).join(',')}\n${values.map(escapeCsvValue).join(',')}`;
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
    case 'whatsapp':
      return item.parsedData?.phone ? `WhatsApp to ${item.parsedData.phone}` : 'WhatsApp Chat';
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
      return getLocationDisplayValue(item.parsedData);
    case 'barcode':
      return 'Barcode';
    case 'coupon':
      return item.parsedData?.title || item.parsedData?.code || 'Coupon';
    case 'play-store':
      return 'Google Play Store';
    case 'app-store':
      return 'App Store';
    case 'calendar':
      return item.parsedData?.title || 'Calendar Event';
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
    case 'whatsapp':
      return { title: 'Open WhatsApp', icon: 'logo-whatsapp' as const };
    case 'location':
      return { title: 'Open Map', icon: 'location-outline' as const };
    case 'calendar':
      return { title: 'Add to Calendar', icon: 'calendar-outline' as const };
    case 'vcard':
      return { title: 'Add to Contacts', icon: 'person-add-outline' as const };
    case 'play-store':
      return { title: 'Open in Play Store', icon: 'open-outline' as const };
    case 'app-store':
      return { title: 'Open in App Store', icon: 'open-outline' as const };
    default:
      return null;
  }
};

async function loadContactsModule() {
  try {
    return await import('expo-contacts');
  } catch {
    return null;
  }
}

const buildHistoryCalendarUrl = (item: HistoryItem) => {
  const eventTitle = item.parsedData?.title || getHistoryItemName(item);
  const eventStart = item.parsedData?.startRaw || item.parsedData?.start;
  const eventEnd = item.parsedData?.endRaw || item.parsedData?.end;
  const eventLocation = item.parsedData?.location || '';
  const eventDescription = item.parsedData?.description || '';
  let calendarUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';

  calendarUrl += `&text=${encodeURIComponent(eventTitle)}`;

  if (eventStart) {
    calendarUrl += `&dates=${String(eventStart).replace(/[-:]/g, '')}/${eventEnd ? String(eventEnd).replace(/[-:]/g, '') : ''}`;
  }

  if (eventLocation) {
    calendarUrl += `&location=${encodeURIComponent(eventLocation)}`;
  }

  if (eventDescription) {
    calendarUrl += `&details=${encodeURIComponent(eventDescription)}`;
  }

  return calendarUrl;
};

const getHistoryTypeInsightLabel = (type?: HistoryItem['type']) => {
  switch (type) {
    case 'vcard':
      return 'Contacts';
    case 'calendar':
      return 'Events';
    case 'play-store':
    case 'app-store':
      return 'Apps';
    case 'url':
      return 'Links';
    case 'wifi':
      return 'Wi-Fi';
    case 'sms':
      return 'SMS';
    case 'whatsapp':
      return 'WhatsApp';
    case 'phone':
      return 'Phones';
    case 'location':
      return 'Locations';
    case 'coupon':
      return 'Coupons';
    case 'barcode':
      return 'Barcodes';
    case 'email':
      return 'Emails';
    case 'text':
      return 'Text';
    default:
      return 'Scans';
  }
};

const buildHistoryInsights = (items: HistoryItem[]) => {
  const totalScans = items.reduce((sum, item) => sum + Math.max(1, item.scanCount || 1), 0);
  const uniqueCodes = items.length;
  const favorites = items.filter((item) => item.isFavorite).length;
  const repeatedCodes = items.filter((item) => (item.scanCount || 1) > 1).length;
  const riskyLinks = items.filter(
    (item) => item.type === 'url' && item.safety?.checked && item.safety.safe === false
  ).length;
  const safeLinks = items.filter(
    (item) => item.type === 'url' && item.safety?.checked && item.safety.safe === true
  ).length;
  const thisWeekCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeekScans = items
    .filter((item) => item.timestamp >= thisWeekCutoff)
    .reduce((sum, item) => sum + Math.max(1, item.scanCount || 1), 0);

  const scanCountsByType = items.reduce((acc, item) => {
    const type = item.type || 'text';
    acc[type] = (acc[type] || 0) + Math.max(1, item.scanCount || 1);
    return acc;
  }, {} as Record<string, number>);

  const topTypeEntry = Object.entries(scanCountsByType).sort((a, b) => b[1] - a[1])[0];

  return {
    totalScans,
    uniqueCodes,
    favorites,
    repeatedCodes,
    riskyLinks,
    safeLinks,
    thisWeekScans,
    topTypeLabel: getHistoryTypeInsightLabel(topTypeEntry?.[0] as HistoryItem['type'] | undefined),
  };
};

interface HistoryScreenProps {
  onTabBarVisibilityChange?: (hidden: boolean) => void;
}

type HistorySortMode = 'date' | 'name';
type VisibilityMotionState = 'visible' | 'showing' | 'hidden' | 'hiding';
const SEARCH_DRAWER_HEIGHT = 60;

export function HistoryScreen({ onTabBarVisibilityChange }: HistoryScreenProps) {
  const { clearAll, removeItem, removeScanId, getGroupedItems, updateItem } = useHistoryStore();
  const { confirmDeleteHistory, showInsights } = useSettingsStore();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [menuItem, setMenuItem] = useState<HistoryItem | null>(null);
  const [renamingItem, setRenamingItem] = useState<HistoryItem | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingNameValue, setEditingNameValue] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const [sortMode, setSortMode] = useState<HistorySortMode>('date');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [isSortReversed, setIsSortReversed] = useState(false);
  const [insightsCollapsed, setInsightsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  }>({
    visible: false,
    title: '',
    message: '',
    confirmLabel: '',
    onConfirm: () => {},
  });
  const [successDialog, setSuccessDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({
    visible: false,
    title: '',
    message: '',
  });
  const { theme } = useAppTheme();
  const lastScrollY = useRef(0);
  const tabBarHidden = useRef(false);
  const searchVisibility = useRef(new Animated.Value(1)).current;
  const searchMotionState = useRef<VisibilityMotionState>('visible');
  const scrollDirection = useRef<-1 | 0 | 1>(0);
  const scrollTravel = useRef(0);
  const inspectHoldTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inspectTouchActive = useRef(false);
  const inspectTouchStartY = useRef(0);
  const touchInspecting = useRef(false);
  const groupedItems = getGroupedItems();
  const visibleGroupedItems = showOnlyFavorites
    ? groupedItems.filter((item) => item.isFavorite)
    : groupedItems;
  const filteredGroupedItems = searchQuery
    ? visibleGroupedItems.filter((item) => {
        const itemName = getHistoryItemName(item).toLowerCase();
        return itemName.includes(searchQuery.toLowerCase());
      })
    : visibleGroupedItems;
  const sortedGroupedItems = [...filteredGroupedItems].sort((a, b) => {
    const baseSortValue = sortMode === 'name'
      ? getHistoryItemName(a).localeCompare(getHistoryItemName(b), undefined, {
          sensitivity: 'base',
          numeric: true,
        })
      : b.timestamp - a.timestamp;

    return isSortReversed ? -baseSortValue : baseSortValue;
  });
  const primaryAction = selectedItem ? getHistoryPrimaryAction(selectedItem) : null;
  const insights = buildHistoryInsights(groupedItems);
  const searchHeight = searchVisibility.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SEARCH_DRAWER_HEIGHT],
  });
  const searchTranslateY = searchVisibility.interpolate({
    inputRange: [0, 1],
    outputRange: [-22, 0],
  });
  const searchOpacity = searchVisibility.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const searchScale = searchVisibility.interpolate({
    inputRange: [0, 1],
    outputRange: [0.985, 1],
  });

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

  const openRenameDialog = (item: HistoryItem) => {
    setMenuItem(null);
    setRenamingItem(item);
    setRenameValue(item.name || getHistoryItemName(item));
  };

  const closeRenameDialog = () => {
    setRenamingItem(null);
    setRenameValue('');
  };

  const handleSaveRename = () => {
    if (!renamingItem) {
      return;
    }

    const trimmedName = renameValue.trim();
    const updates = { name: trimmedName || undefined };

    updateItem(renamingItem.id, updates);

    if (selectedItem?.id === renamingItem.id) {
      setSelectedItem({ ...selectedItem, ...updates });
    }

    closeRenameDialog();
  };

  const setTabBarHidden = useCallback((hidden: boolean, force = false) => {
    if (touchInspecting.current && !hidden && !force) {
      return;
    }

    if (tabBarHidden.current === hidden) {
      return;
    }

    tabBarHidden.current = hidden;
    onTabBarVisibilityChange?.(hidden);
  }, [onTabBarVisibilityChange]);

  useEffect(() => {
    setTabBarHidden(false);

    return () => {
      if (inspectHoldTimeout.current) {
        clearTimeout(inspectHoldTimeout.current);
        inspectHoldTimeout.current = null;
      }
      onTabBarVisibilityChange?.(false);
    };
  }, [onTabBarVisibilityChange, setTabBarHidden]);

  const animateSearchVisibility = useCallback(
    (visible: boolean, force = false) => {
      if (touchInspecting.current && visible && !force) {
        return;
      }

      const nextValue = visible ? 1 : 0;
      const nextState: VisibilityMotionState = visible ? 'showing' : 'hiding';

      if (
        (visible &&
          (searchMotionState.current === 'visible' || searchMotionState.current === 'showing')) ||
        (!visible &&
          (searchMotionState.current === 'hidden' || searchMotionState.current === 'hiding'))
      ) {
        return;
      }

      searchMotionState.current = nextState;
      searchVisibility.stopAnimation((currentValue) => {
        if (Math.abs(currentValue - nextValue) < 0.01) {
          searchVisibility.setValue(nextValue);
          searchMotionState.current = visible ? 'visible' : 'hidden';
          return;
        }

        Animated.timing(searchVisibility, {
          toValue: nextValue,
          duration: 320,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: false,
        }).start(({ finished }) => {
          if (!finished) {
            return;
          }

          searchMotionState.current = visible ? 'visible' : 'hidden';
        });
      });
    },
    [searchVisibility]
  );

  const hideChromeForInspection = useCallback(() => {
    scrollDirection.current = 0;
    scrollTravel.current = 0;
    setTabBarHidden(true);
    animateSearchVisibility(false);
  }, [animateSearchVisibility, setTabBarHidden]);

  const restoreChromeAfterInspection = useCallback(() => {
    scrollDirection.current = 0;
    scrollTravel.current = 0;
    setTabBarHidden(false, true);
    animateSearchVisibility(true, true);
  }, [animateSearchVisibility, setTabBarHidden]);

  const cancelInspectHold = useCallback(() => {
    if (inspectHoldTimeout.current) {
      clearTimeout(inspectHoldTimeout.current);
      inspectHoldTimeout.current = null;
    }
  }, []);

  const handleInspectTouchStart = useCallback((e: any) => {
    inspectTouchActive.current = true;
    inspectTouchStartY.current = e.nativeEvent.pageY;

    if (touchInspecting.current) {
      hideChromeForInspection();
      return;
    }

    cancelInspectHold();
    inspectHoldTimeout.current = setTimeout(() => {
      if (!inspectTouchActive.current) {
        inspectHoldTimeout.current = null;
        return;
      }

      touchInspecting.current = true;
      hideChromeForInspection();
      inspectHoldTimeout.current = null;
    }, 1300);
  }, [cancelInspectHold, hideChromeForInspection]);

  const releaseInspectMode = useCallback(() => {
    inspectTouchActive.current = false;
    cancelInspectHold();

    if (touchInspecting.current) {
      touchInspecting.current = false;
      restoreChromeAfterInspection();
    }
  }, [cancelInspectHold, restoreChromeAfterInspection]);

  const handleInspectTouchEnd = useCallback(() => {
    releaseInspectMode();
  }, [releaseInspectMode]);

  const handleInspectTouchMove = useCallback((e: any) => {
    if (!inspectTouchActive.current) return;

    const currentY = e.nativeEvent.pageY;
    const deltaY = Math.abs(currentY - inspectTouchStartY.current);

    if (deltaY > 10) {
      inspectTouchActive.current = false;
      cancelInspectHold();
    }
  }, [cancelInspectHold]);

  const handleInspectTouchCancel = useCallback(() => {
    if (touchInspecting.current) {
      return;
    }

    inspectTouchActive.current = false;
    cancelInspectHold();
  }, [cancelInspectHold]);

  const handleInspectScrollBeginDrag = useCallback(() => {
    if (touchInspecting.current) {
      hideChromeForInspection();
      return;
    }

    inspectTouchActive.current = false;
    cancelInspectHold();
  }, [cancelInspectHold, hideChromeForInspection]);

  const handleClearAll = () => {
    setConfirmDialog({
      visible: true,
      title: 'Clear History',
      message: 'Are you sure you want to delete all scan history?',
      confirmLabel: 'Clear All',
      onConfirm: () => {
        clearAll();
        setConfirmDialog(prev => ({ ...prev, visible: false }));
      },
      isDestructive: true,
    });
  };

  const handleRemoveItem = (id: string) => {
    if (confirmDeleteHistory) {
      setConfirmDialog({
        visible: true,
        title: 'Delete',
        message: 'Remove this item from history?',
        confirmLabel: 'Delete',
        onConfirm: () => {
          removeItem(id);
          setConfirmDialog(prev => ({ ...prev, visible: false }));
        },
        isDestructive: true,
      });
    } else {
      removeItem(id);
    }
  };

  const handleToggleFavorite = (item: HistoryItem) => {
    const updates = { isFavorite: !item.isFavorite };

    updateItem(item.id, updates);

    if (selectedItem?.id === item.id) {
      setSelectedItem({ ...selectedItem, ...updates });
    }

    setMenuItem(null);
  };

  const handleCopyItemAsText = async (item: HistoryItem) => {
    await Clipboard.setStringAsync(item.rawValue);
    setMenuItem(null);
    setSuccessDialog({
      visible: true,
      title: 'Copied',
      message: 'The history item content has been copied as text.',
    });
  };

  const handleCopyItemAsCsv = async (item: HistoryItem) => {
    await Clipboard.setStringAsync(getHistoryItemCsv(item));
    setMenuItem(null);
    setSuccessDialog({
      visible: true,
      title: 'CSV copied',
      message: 'The history item has been copied as CSV.',
    });
  };

  const handleRemoveScan = (itemId: string, scanId: string) => {
    if (confirmDeleteHistory) {
      setConfirmDialog({
        visible: true,
        title: 'Delete Scan',
        message: 'Remove this individual scan from history?',
        confirmLabel: 'Delete',
        onConfirm: () => {
          removeScanId(itemId, scanId);
          setConfirmDialog(prev => ({ ...prev, visible: false }));
        },
        isDestructive: true,
      });
    } else {
      removeScanId(itemId, scanId);
    }
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
    const absDeltaY = Math.abs(deltaY);

    if (absDeltaY < 1) {
      lastScrollY.current = currentY;
      return;
    }

    if (touchInspecting.current) {
      lastScrollY.current = currentY;
      return;
    }

    if (currentY <= 16) {
      setTabBarHidden(false);
      scrollDirection.current = 0;
      scrollTravel.current = 0;
      animateSearchVisibility(true);
      lastScrollY.current = currentY;
      return;
    }

    const nextDirection: -1 | 1 = deltaY > 0 ? 1 : -1;

    if (scrollDirection.current !== nextDirection) {
      scrollDirection.current = nextDirection;
      scrollTravel.current = 0;
    }

    scrollTravel.current += absDeltaY;

    if (nextDirection === 1) {
      if (scrollTravel.current >= 32 && currentY > 72) {
        setTabBarHidden(true);
        animateSearchVisibility(false);
        scrollTravel.current = 0;
      }
    } else if (scrollTravel.current >= 24) {
      setTabBarHidden(false);
      animateSearchVisibility(true);
      scrollTravel.current = 0;
    }

    lastScrollY.current = currentY;
  };

  const handleCopySelectedItem = async () => {
    if (!selectedItem) {
      return;
    }

    await Clipboard.setStringAsync(selectedItem.rawValue);
    setSuccessDialog({
      visible: true,
      title: selectedItem.type === 'url' ? 'Link copied' : 'Copied',
      message: selectedItem.type === 'url'
        ? 'The scanned link has been copied to your clipboard.'
        : 'The scanned content has been copied to your clipboard.',
    });
  };

  const handleCopySelectedSpecialValue = async () => {
    if (!selectedItem) {
      return;
    }

    let valueToCopy = '';
    let title = 'Copied';
    let message = 'The selected value has been copied to your clipboard.';

    if (selectedItem.type === 'coupon' && selectedItem.parsedData?.code) {
      valueToCopy = selectedItem.parsedData.code;
      title = 'Coupon code copied';
      message = 'The coupon code has been copied to your clipboard.';
    }

    if (selectedItem.type === 'whatsapp') {
      valueToCopy = selectedItem.parsedData?.message || selectedItem.parsedData?.phone || '';
      title = selectedItem.parsedData?.message ? 'Message copied' : 'Number copied';
      message = selectedItem.parsedData?.message
        ? 'The WhatsApp message has been copied to your clipboard.'
        : 'The WhatsApp number has been copied to your clipboard.';
    }

    if (!valueToCopy) {
      return;
    }

    await Clipboard.setStringAsync(valueToCopy);
    setSuccessDialog({
      visible: true,
      title,
      message,
    });
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
      case 'whatsapp':
        await Linking.openURL(selectedItem.parsedData?.url || selectedItem.rawValue);
        return;
      case 'location': {
        const query = selectedItem.parsedData?.query;
        const latitude = selectedItem.parsedData?.latitude;
        const longitude = selectedItem.parsedData?.longitude;

        if (
          /^https?:\/\//i.test(selectedItem.rawValue) &&
          (
            !query ||
            /^https?:\/\//i.test(String(query)) ||
            query === 'Google Maps Link'
          )
        ) {
          await WebBrowser.openBrowserAsync(selectedItem.parsedData?.url || selectedItem.rawValue);
          return;
        }

        if (query) {
          const encodedQuery = encodeURIComponent(query);
          const mapUrl =
            Platform.OS === 'ios'
              ? `http://maps.apple.com/?q=${encodedQuery}`
              : Platform.OS === 'android'
                ? `geo:0,0?q=${encodedQuery}`
                : `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;

          await Linking.openURL(mapUrl);
          return;
        }

        if (typeof latitude === 'number' && typeof longitude === 'number') {
          const coordinates = `${latitude},${longitude}`;
          const mapUrl =
            Platform.OS === 'ios'
              ? `http://maps.apple.com/?ll=${coordinates}`
              : Platform.OS === 'android'
                ? `geo:${coordinates}`
                : `https://maps.google.com/?q=${coordinates}`;

          await Linking.openURL(mapUrl);
        }
        return;
      }
      case 'calendar': {
        const startDate = parseHistoryCalendarDate(selectedItem.parsedData?.startRaw);
        const endDate = parseHistoryCalendarDate(selectedItem.parsedData?.endRaw);

        if (!startDate || !endDate) {
          Alert.alert('Calendar event invalid', 'This history item does not include a valid event date.');
          return;
        }

        await Linking.openURL(buildHistoryCalendarUrl(selectedItem));
        return;
      }
      case 'vcard': {
        const Contacts = await loadContactsModule();

        if (!Contacts) {
          Alert.alert('Contacts unavailable', 'This app build does not include contact support yet. Rebuild the app to use this action.');
          return;
        }

        const isAvailable = await Contacts.isAvailableAsync();

        if (!isAvailable) {
          Alert.alert('Contacts unavailable', 'This device does not support contact creation.');
          return;
        }

        const permission = await Contacts.requestPermissionsAsync();
        if (permission.status !== 'granted') {
          Alert.alert('Permission needed', 'Allow contacts access to save this contact.');
          return;
        }

        const fullName = [selectedItem.parsedData?.firstName, selectedItem.parsedData?.lastName]
          .filter(Boolean)
          .join(' ')
          .trim();

        await Contacts.presentFormAsync(
          null,
          {
            contactType: Contacts.ContactTypes.Person,
            name: fullName || selectedItem.parsedData?.company || 'New Contact',
            firstName: selectedItem.parsedData?.firstName || undefined,
            lastName: selectedItem.parsedData?.lastName || undefined,
            company: selectedItem.parsedData?.company || undefined,
            jobTitle: selectedItem.parsedData?.jobTitle || undefined,
            phoneNumbers: selectedItem.parsedData?.phone
              ? [{ label: 'mobile', number: selectedItem.parsedData.phone }]
              : undefined,
            emails: selectedItem.parsedData?.email
              ? [{ label: 'work', email: selectedItem.parsedData.email }]
              : undefined,
            urlAddresses: selectedItem.parsedData?.website
              ? [{ label: 'homepage', url: selectedItem.parsedData.website }]
              : undefined,
            addresses: selectedItem.parsedData?.address
              ? [{ label: 'work', street: selectedItem.parsedData.address }]
              : undefined,
          },
          {
            allowsEditing: true,
            isNew: true,
          }
        );
        return;
      }
      case 'play-store':
      case 'app-store':
        await WebBrowser.openBrowserAsync(selectedItem.parsedData?.url || selectedItem.rawValue);
        return;
      default:
        return;
    }
  };

  const handleAddSelectedPhoneToContacts = async () => {
    if (selectedItem?.type !== 'phone') {
      return;
    }

    const Contacts = await loadContactsModule();

    if (!Contacts) {
      Alert.alert('Contacts unavailable', 'This app build does not include contact support yet. Rebuild the app to use this action.');
      return;
    }

    const isAvailable = await Contacts.isAvailableAsync();

    if (!isAvailable) {
      Alert.alert('Contacts unavailable', 'This device does not support contact creation.');
      return;
    }

    const permission = await Contacts.requestPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission needed', 'Allow contacts access to save this contact.');
      return;
    }

    const phoneNumber = selectedItem.parsedData?.phone || selectedItem.rawValue.replace(/^tel:/i, '');

    await Contacts.presentFormAsync(
      null,
      {
        contactType: Contacts.ContactTypes.Person,
        name: phoneNumber,
        phoneNumbers: [{ label: 'mobile', number: phoneNumber }],
      },
      {
        allowsEditing: true,
        isNew: true,
      }
    );
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
      <View
        style={[
          s.header,
          {
            backgroundColor: theme.background,
            borderBottomColor: theme.border,
          },
        ]}
      >
        <View style={s.headerTopRow}>
          <Text style={[s.headerTitle, { color: theme.text.primary }]}>History</Text>
          <Pressable onPress={handleClearAll}>
            <Text style={[s.clearBtn, { color: theme.danger }]}>Clear All</Text>
          </Pressable>
        </View>
        <View style={s.headerControlsRow}>
          <View style={[s.sortControl, { backgroundColor: theme.surfaceStrong, borderColor: theme.border }]}>
            <Pressable
              style={[s.sortOption, sortMode === 'date' && !theme.accentGradient && { backgroundColor: theme.accent }]}
              onPress={() => setSortMode('date')}
            >
              {sortMode === 'date' && theme.accentGradient && theme.accentGradient.length >= 2 ? (
                <LinearGradient
                  colors={theme.accentGradient as any}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[s.sortOptionGradient, { borderWidth: 1, borderColor: theme.accent }]}
                >
                  <Ionicons
                    name="time-outline"
                    size={13}
                    color="#FFFFFF"
                  />
                  <Text style={[s.sortOptionText, { color: '#FFFFFF' }]}>
                    Date
                  </Text>
                </LinearGradient>
              ) : (
                <>
                  <Ionicons
                    name="time-outline"
                    size={13}
                    color={sortMode === 'date' ? '#FFFFFF' : theme.text.secondary}
                  />
                  <Text
                    style={[
                      s.sortOptionText,
                      { color: sortMode === 'date' ? '#FFFFFF' : theme.text.secondary },
                    ]}
                  >
                    Date
                  </Text>
                </>
              )}
            </Pressable>
            <Pressable
              style={[s.sortOption, sortMode === 'name' && !theme.accentGradient && { backgroundColor: theme.accent }]}
              onPress={() => setSortMode('name')}
            >
              {sortMode === 'name' && theme.accentGradient && theme.accentGradient.length >= 2 ? (
                <LinearGradient
                  colors={theme.accentGradient as any}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[s.sortOptionGradient, { borderWidth: 1, borderColor: theme.accent }]}
                >
                  <Ionicons
                    name="text-outline"
                    size={13}
                    color="#FFFFFF"
                  />
                  <Text style={[s.sortOptionText, { color: '#FFFFFF' }]}>
                    Name
                  </Text>
                </LinearGradient>
              ) : (
                <>
                  <Ionicons
                    name="text-outline"
                    size={13}
                    color={sortMode === 'name' ? '#FFFFFF' : theme.text.secondary}
                  />
                  <Text
                    style={[
                      s.sortOptionText,
                      { color: sortMode === 'name' ? '#FFFFFF' : theme.text.secondary },
                    ]}
                  >
                    Name
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          <Pressable
            style={[
              s.headerActionButton,
              {
                backgroundColor: showOnlyFavorites ? theme.accent : theme.surface,
                borderColor: showOnlyFavorites ? theme.accent : theme.border,
              },
            ]}
            onPress={() => setShowOnlyFavorites((prev) => !prev)}
          >
            <Ionicons
              name={showOnlyFavorites ? 'star' : 'star-outline'}
              size={15}
              color={showOnlyFavorites ? '#FFFFFF' : theme.text.secondary}
            />
            <Text style={[s.headerActionButtonText, { color: showOnlyFavorites ? '#FFFFFF' : theme.text.secondary }]}>
              Favs
            </Text>
          </Pressable>

          <Pressable
            style={[
              s.headerIconButton,
              {
                backgroundColor: isSortReversed ? theme.accent : theme.surface,
                borderColor: isSortReversed ? theme.accent : theme.border,
              },
            ]}
            onPress={() => setIsSortReversed((prev) => !prev)}
          >
            <Ionicons
              name="swap-vertical-outline"
              size={16}
              color={isSortReversed ? '#FFFFFF' : theme.text.secondary}
            />
          </Pressable>
        </View>
      </View>

      <Animated.View style={[s.searchClip, { zIndex: searchOpacity.interpolate({ inputRange: [0, 1], outputRange: [1, 5] }) }]} pointerEvents="box-none">
        <Animated.View
          style={[
            s.searchClipContent,
            {
              opacity: searchOpacity,
              transform: [{ translateY: searchTranslateY }, { scale: searchScale }],
            },
          ]}
          pointerEvents="box-none"
        >
          <View
            style={[
              s.searchPill,
              {
                backgroundColor: theme.surfaceStrong,
                borderColor: theme.border,
                shadowColor: theme.shadow,
              },
            ]}
            pointerEvents="box-none"
          >
            <Ionicons name="search-outline" size={18} color={theme.text.tertiary} />
            <TextInput
              style={[s.searchInput, { color: theme.text.primary }]}
              placeholder="Search scans..."
              placeholderTextColor={theme.text.tertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={theme.text.tertiary} />
              </Pressable>
            )}
          </View>
        </Animated.View>
      </Animated.View>

      <FlatList
        data={sortedGroupedItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          s.listContent,
          sortedGroupedItems.length === 0 && s.emptyListContent,
        ]}
        onScroll={handleScroll}
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={s.emptyIcon}>⭐</Text>
                <Text style={[s.emptyTitle, { color: theme.text.primary }]}>No favorites yet</Text>
                <Text style={[s.emptySubtitle, { color: theme.text.secondary }]}>
                  Favorite scans will appear here when the filter is enabled.
                </Text>
              </View>
            }
            ListHeaderComponent={
              showInsights ? (
                <Card style={s.insightsCard}>
                  <View style={s.insightsHeader}>
                    <View>
                      <Text style={[s.insightsTitle, { color: theme.text.primary }]}>Insights</Text>
                      <Text style={[s.insightsSubtitle, { color: theme.text.secondary }]}>
                        Faster signal on how people actually use your scans.
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => setInsightsCollapsed(!insightsCollapsed)}
                    style={s.insightsCollapseButton}
                  >
                    <Ionicons
                      name={insightsCollapsed ? 'chevron-down' : 'chevron-up'}
                      size={20}
                      color={theme.text.secondary}
                    />
                  </Pressable>

                  {!insightsCollapsed && (
                    <>
                      <View style={s.insightsGrid}>
                        <View style={[s.insightTile, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                          <Text style={[s.insightValue, { color: theme.text.primary }]}>{insights.totalScans}</Text>
                          <Text style={[s.insightLabel, { color: theme.text.secondary }]}>Total scans</Text>
                        </View>
                        <View style={[s.insightTile, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                          <Text style={[s.insightValue, { color: theme.text.primary }]}>{insights.uniqueCodes}</Text>
                          <Text style={[s.insightLabel, { color: theme.text.secondary }]}>Unique codes</Text>
                        </View>
                        <View style={[s.insightTile, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                          <Text style={[s.insightValue, { color: theme.text.primary }]}>{insights.thisWeekScans}</Text>
                          <Text style={[s.insightLabel, { color: theme.text.secondary }]}>Last 7 days</Text>
                        </View>
                        <View style={[s.insightTile, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                          <Text style={[s.insightValue, { color: theme.text.primary }]}>{insights.favorites}</Text>
                          <Text style={[s.insightLabel, { color: theme.text.secondary }]}>Favorites</Text>
                        </View>
                      </View>

                      <View style={s.insightHighlights}>
                        <View style={[s.insightChip, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                          <Ionicons name="layers-outline" size={15} color={theme.accent} />
                          <Text style={[s.insightChipText, { color: theme.text.primary }]}>
                            Top type: {insights.topTypeLabel}
                          </Text>
                        </View>
                        <View style={[s.insightChip, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                          <Ionicons name="repeat-outline" size={15} color={theme.accent} />
                          <Text style={[s.insightChipText, { color: theme.text.primary }]}>
                            Repeats: {insights.repeatedCodes}
                          </Text>
                        </View>
                        <View style={[s.insightChip, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                          <Ionicons name="shield-checkmark-outline" size={15} color={theme.success} />
                          <Text style={[s.insightChipText, { color: theme.text.primary }]}>
                            Safe links: {insights.safeLinks}
                          </Text>
                        </View>
                        <View style={[s.insightChip, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                          <Ionicons name="warning-outline" size={15} color={theme.danger} />
                          <Text style={[s.insightChipText, { color: theme.text.primary }]}>
                            Flagged: {insights.riskyLinks}
                          </Text>
                        </View>
                      </View>
                    </>
                  )}
                </Card>
              ) : null
            }
            renderItem={({ item }) => (
              <HistoryItemComponent
                item={item}
                isExpanded={expandedItems.has(item.id)}
                onToggleExpanded={() => toggleExpanded(item.id)}
                onOpenMenu={() => setMenuItem(item)}
                onRemoveScan={handleRemoveScan}
                onPress={() => setSelectedItem(item)}
                theme={theme}
              />
            )}
            scrollEventThrottle={16}
          />
      </View>

      <ConfirmDialog
        visible={confirmDialog.visible}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, visible: false }))}
        isDestructive={confirmDialog.isDestructive}
      />

      <SuccessDialog
        visible={successDialog.visible}
        title={successDialog.title}
        message={successDialog.message}
        onClose={() => setSuccessDialog(prev => ({ ...prev, visible: false }))}
      />

      {menuItem ? (
        <HistoryItemMenu
          item={menuItem}
          theme={theme}
          onClose={() => setMenuItem(null)}
          onToggleFavorite={() => handleToggleFavorite(menuItem)}
          onRename={() => openRenameDialog(menuItem)}
          onCopyText={() => handleCopyItemAsText(menuItem)}
          onCopyCsv={() => handleCopyItemAsCsv(menuItem)}
          onDelete={() => {
            const itemId = menuItem.id;
            setMenuItem(null);
            handleRemoveItem(itemId);
          }}
        />
      ) : null}

      {renamingItem ? (
        <Modal
          transparent
          visible
          animationType="fade"
          onRequestClose={closeRenameDialog}
        >
          <View style={s.actionMenuOverlay}>
            <Pressable
              style={[s.actionMenuBackdrop, { backgroundColor: theme.backdrop }]}
              onPress={closeRenameDialog}
            />
            <View
              style={[
                s.renameDialog,
                {
                  backgroundColor: theme.surfaceStrong,
                  borderColor: theme.border,
                  shadowColor: theme.shadow,
                },
              ]}
            >
              <Text style={[s.renameTitle, { color: theme.text.primary }]}>Change title</Text>
              <TextInput
                style={[
                  s.renameInput,
                  {
                    color: theme.text.primary,
                    borderColor: theme.border,
                    backgroundColor: theme.surface,
                  },
                ]}
                value={renameValue}
                onChangeText={setRenameValue}
                autoFocus
                onSubmitEditing={handleSaveRename}
                returnKeyType="done"
                placeholder="Enter a title..."
                placeholderTextColor={theme.text.tertiary}
              />
              <View style={s.renameActions}>
                <View style={s.renameActionButton}>
                  <Button
                    title="Cancel"
                    onPress={closeRenameDialog}
                    variant="secondary"
                    size="medium"
                  />
                </View>
                <View style={s.renameActionButton}>
                  <Button
                    title="Save"
                    onPress={handleSaveRename}
                    variant="primary"
                    size="medium"
                  />
                </View>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}

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
                  backgroundColor: theme.surfaceStrong,
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
              <View style={[s.detailCard, { backgroundColor: theme.surfaceStrong, borderColor: theme.border }]}>
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
              <DetailCard label="Type" value={getDetailTypeLabel(selectedItem.type)} theme={theme} />
              {renderSelectedItemDetails(selectedItem, theme)}
              {selectedItem.type !== 'vcard' && selectedItem.type !== 'calendar' ? (
                <DetailCard
                  label={selectedItem.type === 'url' ? 'Link' : 'Content'}
                  value={getHistoryItemContentValue(selectedItem)}
                  theme={theme}
                />
              ) : null}
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
                  backgroundColor: theme.surfaceStrong,
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
              {selectedItem.type === 'phone' ? (
                <View style={[s.modalActionRow, s.modalActionRowSpacing]}>
                  <View style={s.modalActionButton}>
                    <Button
                      title="Add to Contacts"
                      onPress={handleAddSelectedPhoneToContacts}
                      variant="secondary"
                      icon={
                        <Ionicons
                          name="person-add-outline"
                          size={20}
                          color={theme.text.primary}
                        />
                      }
                    />
                  </View>
                  <View style={s.modalActionButton} />
                </View>
              ) : null}
              {selectedItem.type === 'coupon' || selectedItem.type === 'whatsapp' ? (
                <View style={[s.modalActionRow, s.modalActionRowSpacing]}>
                  <View style={s.modalActionButton}>
                    <Button
                      title={
                        selectedItem.type === 'coupon'
                          ? 'Copy Code'
                          : selectedItem.parsedData?.message
                            ? 'Copy Message'
                            : 'Copy Number'
                      }
                      onPress={handleCopySelectedSpecialValue}
                      variant="secondary"
                      icon={
                        <Ionicons
                          name="copy-outline"
                          size={20}
                          color={theme.text.primary}
                        />
                      }
                    />
                  </View>
                  <View style={s.modalActionButton} />
                </View>
              ) : null}
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
          backgroundColor: theme.surfaceStrong,
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

function renderSelectedItemDetails(item: HistoryItem, theme: ThemeColors) {
  if (item.type === 'vcard') {
    const cards = [
      {
        label: 'Contact',
        value:
          [item.parsedData?.firstName, item.parsedData?.lastName].filter(Boolean).join(' ').trim() ||
          item.parsedData?.company ||
          'Contact',
      },
      item.parsedData?.jobTitle ? { label: 'Job Title', value: item.parsedData.jobTitle } : null,
      item.parsedData?.company ? { label: 'Company', value: item.parsedData.company } : null,
      item.parsedData?.phone ? { label: 'Phone', value: item.parsedData.phone } : null,
      item.parsedData?.email ? { label: 'Email', value: item.parsedData.email } : null,
      item.parsedData?.website ? { label: 'Website', value: item.parsedData.website } : null,
      item.parsedData?.address ? { label: 'Address', value: item.parsedData.address } : null,
    ].filter(Boolean) as Array<{ label: string; value: string }>;

    return cards.map((card) => (
      <DetailCard key={`${item.id}-${card.label}`} label={card.label} value={card.value} theme={theme} />
    ));
  }

  if (item.type === 'calendar') {
    const cards = [
      { label: 'Event', value: item.parsedData?.title || 'Calendar Event' },
      item.parsedData?.start ? { label: 'Start', value: item.parsedData.start } : null,
      item.parsedData?.end ? { label: 'End', value: item.parsedData.end } : null,
      item.parsedData?.location ? { label: 'Location', value: item.parsedData.location } : null,
      item.parsedData?.description ? { label: 'Description', value: item.parsedData.description } : null,
    ].filter(Boolean) as Array<{ label: string; value: string }>;

    return cards.map((card) => (
      <DetailCard key={`${item.id}-${card.label}`} label={card.label} value={card.value} theme={theme} />
    ));
  }

  return null;
}

function parseHistoryCalendarDate(value?: string) {
  if (!value) {
    return null;
  }

  const compact = String(value).replace(/[^\d]/g, '');

  if (compact.length < 8) {
    return null;
  }

  const year = Number(compact.slice(0, 4));
  const month = Number(compact.slice(4, 6)) - 1;
  const day = Number(compact.slice(6, 8));
  const hours = compact.length >= 10 ? Number(compact.slice(8, 10)) : 0;
  const minutes = compact.length >= 12 ? Number(compact.slice(10, 12)) : 0;
  const candidate = new Date(year, month, day, hours, minutes, 0, 0);

  if (Number.isNaN(candidate.getTime())) {
    return null;
  }

  return candidate;
}

function HistoryItemComponent({
  item,
  isExpanded,
  onToggleExpanded,
  onOpenMenu,
  onRemoveScan,
  onPress,
  theme,
}: {
  item: HistoryItem;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onOpenMenu: () => void;
  onRemoveScan: (itemId: string, scanId: string) => void;
  onPress: () => void;
  theme: ThemeColors;
}) {
  const [imgError, setImgError] = useState(false);
  const domain = getDomainFromUrl(item.rawValue);
  const isGrouped = (item.scanCount || 0) > 1;
  const displayUrl =
    item.type === 'url' ? getHistoryPreviewUrl(item.parsedData?.url || item.rawValue) : null;

  return (
    <LiquidGlassSurface
      style={[
        s.historyCard,
        {
          borderColor: theme.border,
          shadowColor: theme.shadow,
        },
      ]}
      borderRadius={28}
      showOutline={false}
      showHighlight={false}
    >
      {item.isFavorite ? (
        <View style={s.favoriteBadge}>
          <Ionicons name="star" size={18} color={theme.warning} />
        </View>
      ) : null}
      <Pressable style={s.cardContent} onPress={onPress}>
        <View style={[s.iconContainer, { backgroundColor: theme.surface }]}>
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
              {truncateText(getHistoryItemName(item), 32)}
            </Text>
            {isGrouped ? (
              theme.accentStrongGradient && theme.accentStrongGradient.length >= 2 ? (
                <LinearGradient
                  colors={theme.accentStrongGradient as any}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[s.scanCount, { borderWidth: 1, borderColor: theme.accent }]}
                >
                  <Text style={s.scanCountText}>{item.scanCount}</Text>
                </LinearGradient>
              ) : (
                <View style={[s.scanCount, { backgroundColor: theme.accent }]}>
                  <Text style={s.scanCountText}>{item.scanCount}</Text>
                </View>
              )
            ) : null}
          </View>
          {displayUrl ? (
            <Text
              style={[s.urlText, { color: theme.text.tertiary }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {displayUrl}
            </Text>
          ) : null}
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
          <Pressable style={s.menuBtn} onPress={onOpenMenu}>
            <Ionicons name="ellipsis-horizontal" size={18} color={theme.text.secondary} />
          </Pressable>
        </View>
      </Pressable>

      {isExpanded && isGrouped && item.scanIds ? (
        <View
          style={[
            s.expandedContent,
            { backgroundColor: theme.surface, borderTopColor: theme.border },
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
    </LiquidGlassSurface>
  );
}

function HistoryItemMenu({
  item,
  theme,
  onClose,
  onToggleFavorite,
  onRename,
  onCopyText,
  onCopyCsv,
  onDelete,
}: {
  item: HistoryItem;
  theme: ThemeColors;
  onClose: () => void;
  onToggleFavorite: () => void;
  onRename: () => void;
  onCopyText: () => void;
  onCopyCsv: () => void;
  onDelete: () => void;
}) {
  const menuOptions = [
    {
      label: item.isFavorite ? 'Remove favorite' : 'Add to favorites',
      icon: item.isFavorite ? 'star' : 'star-outline',
      color: theme.warning,
      onPress: onToggleFavorite,
    },
    {
      label: 'Change title',
      icon: 'create-outline',
      color: theme.text.primary,
      onPress: onRename,
    },
    {
      label: 'Copy as text',
      icon: 'copy-outline',
      color: theme.text.primary,
      onPress: onCopyText,
    },
    {
      label: 'Copy as CSV',
      icon: 'document-text-outline',
      color: theme.text.primary,
      onPress: onCopyCsv,
    },
    {
      label: 'Delete history card',
      icon: 'trash-outline',
      color: theme.danger,
      onPress: onDelete,
    },
  ] as const;

  return (
    <Modal
      transparent
      visible
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={s.actionMenuOverlay}>
        <Pressable
          style={[s.actionMenuBackdrop, { backgroundColor: theme.backdrop }]}
          onPress={onClose}
        />
        <View
          style={s.listTouchRegion}
          pointerEvents="box-none"
        >
          <View
            style={[
              s.actionMenu,
              {
                backgroundColor: theme.surfaceStrong,
                borderColor: theme.border,
                shadowColor: theme.shadow,
              },
            ]}
          >
            <Text style={[s.actionMenuTitle, { color: theme.text.primary }]}>
              {truncateText(getHistoryItemName(item), 48)}
            </Text>
            {menuOptions.map((option) => (
              <Pressable
                key={option.label}
                style={({ pressed }) => [
                  s.actionMenuOption,
                  pressed && { backgroundColor: theme.background },
                ]}
                onPress={option.onPress}
              >
                <Ionicons name={option.icon} size={20} color={option.color} />
                <Text style={[s.actionMenuOptionText, { color: option.color }]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
            <Pressable
              key={option.label}
              style={({ pressed }) => [
                s.actionMenuOption,
                pressed && { backgroundColor: theme.background },
              ]}
              onPress={option.onPress}
            >
              <Ionicons name={option.icon} size={20} color={option.color} />
              <Text style={[s.actionMenuOptionText, { color: option.color }]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 12,
    borderBottomWidth: 1,
    zIndex: 3,
    elevation: 6,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  searchClip: {
    overflow: 'hidden',
  },
  searchClipContent: {
    paddingHorizontal: 20,
  },
  headerControlsRow: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  sortControl: {
    flexDirection: 'row',
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 2,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 12,
    flex: 1,
  },
  sortOptionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 12,
    width: '100%',
  },
  sortOptionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  headerActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 32,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 10,
  },
  headerActionButtonText: {
    fontSize: 11,
    fontWeight: '600',
  },
  headerIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingTop: 44,
    paddingBottom: 140,
  },
  listTouchRegion: {
    flex: 1,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  insightsCard: {
    marginHorizontal: 20,
    marginBottom: 12,
  },
  insightsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  insightsCollapseButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  insightsSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },
  insightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  insightTile: {
    width: '48%',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  insightValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  insightLabel: {
    marginTop: 4,
    fontSize: 12,
  },
  insightHighlights: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  insightChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  insightChipText: {
    fontSize: 12,
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
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  historyCard: {
    marginHorizontal: 20,
    marginVertical: 6,
    borderRadius: 28,
    position: 'relative',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
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
  favoriteBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 1,
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
  urlText: {
    fontSize: 11,
    lineHeight: 13,
    marginTop: 1,
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
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
  menuBtn: {
    padding: 6,
    borderRadius: 4,
  },
  actionMenuOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  actionMenuBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  actionMenu: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 8,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  actionMenuTitle: {
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  actionMenuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  actionMenuOptionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  renameDialog: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  renameTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
  },
  renameInput: {
    borderWidth: 1,
    borderRadius: 12,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  renameActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  renameActionButton: {
    flex: 1,
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
  modalActionRowSpacing: {
    marginTop: 12,
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
