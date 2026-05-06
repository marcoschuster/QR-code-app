import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Linking, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useTestAudio } from '../../hooks/useTestAudio';
import { spacing, typography } from '../../constants/theme';
import { useAppTheme } from '../../hooks/useAppTheme';
import { ConfirmDialog } from './ConfirmDialog';
import { ColorOrbitPicker } from './ColorOrbitPicker';
import { SupportDialog } from './SupportDialog';

interface SettingsScreenProps {
  visible: boolean;
  onClose: () => void;
}

const accentColorLabels: Record<string, string> = {
  peach: 'Beach Peach',
};

export function SettingsScreen({ visible, onClose }: SettingsScreenProps) {
  const { theme } = useAppTheme();
  const { playTestSound } = useTestAudio();
  const [accentColorExpanded, setAccentColorExpanded] = useState(false);
  const [supportDialogVisible, setSupportDialogVisible] = useState(false);
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
  
  const {
    appearance,
    accentColor,
    autoOpenUrls,
    saveToHistory,
    vibrateOnScan,
    beepOnScan,
    urlThreatScanning,
    autoCopyScanned,
    swipeNavigation,
    confirmDeleteHistory,
    showInsights,
    showSmartStart,
    updateSettings,
    resetSettings,
  } = useSettingsStore();

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const handleToggle = (key: string, value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateSettings({ [key]: value });
  };

  const handleAppearanceChange = (value: 'light' | 'dark' | 'system') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateSettings({ appearance: value });
  };

  const handleAccentColorChange = (value: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateSettings({ accentColor: value });
  };

  const handleOpenSystemSettings = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openSettings();
  };

  const handleOpenSupport = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSupportDialogVisible(true);
  };

  const handleClearHistory = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setConfirmDialog({
      visible: true,
      title: 'Clear History',
      message: 'Are you sure you want to delete all saved scans?',
      confirmLabel: 'Clear',
      onConfirm: () => {
        const { useHistoryStore } = require('../../store/useHistoryStore');
        useHistoryStore.getState().clearAll();
        setConfirmDialog(prev => ({ ...prev, visible: false }));
        setTimeout(() => {
          Alert.alert('Done', 'All scan history has been cleared.');
        }, 300);
      },
      isDestructive: true,
    });
  };

  const handleResetSettings = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setConfirmDialog({
      visible: true,
      title: 'Reset Settings',
      message: 'Are you sure you want to reset all settings to default values?',
      confirmLabel: 'Reset',
      onConfirm: () => {
        resetSettings();
        setConfirmDialog(prev => ({ ...prev, visible: false }));
        setTimeout(() => {
          Alert.alert('Done', 'All settings have been reset to default values.');
        }, 300);
      },
      isDestructive: true,
    });
  };

  const handleTestAudio = async () => {
    console.log('🔊 Testing audio feedback...');
    await playTestSound();
  };

  const handleTestHaptic = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('🔊 Testing haptic...');
    
    try {
      // Test different haptic patterns
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      console.log('🔊 Test haptic played successfully!');
    } catch (error) {
      console.log('❌ Test haptic failed:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={[
            styles.backdrop,
            { backgroundColor: theme.backdrop },
          ]}
          onPress={handleClose}
        />
        
        <View
          style={[
            styles.modal,
            {
              backgroundColor: theme.surfaceStrong,
              shadowColor: theme.shadow,
              borderColor: theme.border,
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.text.primary} />
            </Pressable>
            <Text style={[styles.title, { color: theme.text.primary }]}>Settings</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Permissions Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text.secondary }]}>
                PERMISSIONS
              </Text>
              <View style={[styles.sectionContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Pressable
                  style={styles.settingItem}
                  onPress={handleOpenSystemSettings}
                >
                  <View style={styles.settingLeft}>
                    <View style={[styles.iconWrapper, { backgroundColor: theme.accent + '20' }]}>
                      <Ionicons name="camera-outline" size={20} color={theme.accent} />
                    </View>
                    <View style={styles.settingTextContainer}>
                      <Text style={[styles.settingText, { color: theme.text.primary }]}>
                        Camera Access
                      </Text>
                      <Text style={[styles.settingHint, { color: theme.text.secondary }]}>
                        Tap to open system settings
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.text.tertiary} />
                </Pressable>
              </View>
            </View>

            {/* Scanning Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text.secondary }]}>
                SCANNING
              </Text>
              <View style={[styles.sectionContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Pressable
                  style={styles.settingItem}
                  onPress={() => handleToggle('autoOpenUrls', !autoOpenUrls)}
                >
                  <View style={styles.settingLeft}>
                    <View style={[styles.iconWrapper, { backgroundColor: '#34C75920' }]}>
                      <Ionicons name="open-outline" size={20} color="#34C759" />
                    </View>
                    <View style={styles.settingTextContainer}>
                      <Text style={[styles.settingText, { color: theme.text.primary }]}>
                        Auto-open URLs
                      </Text>
                      <Text style={[styles.settingHint, { color: theme.text.secondary }]}>
                        Automatically open scanned links
                      </Text>
                    </View>
                  </View>
                  {autoOpenUrls && theme.accentGradient && theme.accentGradient.length >= 2 ? (
                    <LinearGradient
                      colors={theme.accentGradient as any}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.switchTrack, { borderWidth: 1, borderColor: theme.accent }]}
                    >
                      <View style={[styles.switchThumb, styles.switchThumbOn]} />
                    </LinearGradient>
                  ) : (
                    <View style={[styles.switchTrack, autoOpenUrls && { backgroundColor: theme.accent }]}>
                      <View style={[styles.switchThumb, autoOpenUrls && styles.switchThumbOn]} />
                    </View>
                  )}
                </Pressable>

                <View style={[styles.divider, { backgroundColor: theme.border }]} />

                <Pressable
                  style={styles.settingItem}
                  onPress={() => handleToggle('saveToHistory', !saveToHistory)}
                >
                  <View style={styles.settingLeft}>
                    <View style={[styles.iconWrapper, { backgroundColor: '#5856D620' }]}>
                      <Ionicons name="time-outline" size={20} color="#5856D6" />
                    </View>
                    <View style={styles.settingTextContainer}>
                      <Text style={[styles.settingText, { color: theme.text.primary }]}>
                        Save to History
                      </Text>
                      <Text style={[styles.settingHint, { color: theme.text.secondary }]}>
                        Keep a record of scanned codes
                      </Text>
                    </View>
                  </View>
                  {saveToHistory && theme.accentGradient && theme.accentGradient.length >= 2 ? (
                    <LinearGradient
                      colors={theme.accentGradient as any}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.switchTrack, { borderWidth: 1, borderColor: theme.accent }]}
                    >
                      <View style={[styles.switchThumb, styles.switchThumbOn]} />
                    </LinearGradient>
                  ) : (
                    <View style={[styles.switchTrack, saveToHistory && { backgroundColor: theme.accent }]}>
                      <View style={[styles.switchThumb, saveToHistory && styles.switchThumbOn]} />
                    </View>
                  )}
                </Pressable>

                <View style={[styles.divider, { backgroundColor: theme.border }]} />

                <Pressable
                  style={styles.settingItem}
                  onPress={() => handleToggle('vibrateOnScan', !vibrateOnScan)}
                >
                  <View style={styles.settingLeft}>
                    <View style={[styles.iconWrapper, { backgroundColor: '#FF950020' }]}>
                      <Ionicons name="phone-portrait-outline" size={20} color="#FF9500" />
                    </View>
                    <View style={styles.settingTextContainer}>
                      <Text style={[styles.settingText, { color: theme.text.primary }]}>
                        Haptic Feedback
                      </Text>
                      <Text style={[styles.settingHint, { color: theme.text.secondary }]}>
                        Vibrate on successful scan
                      </Text>
                    </View>
                  </View>
                  {vibrateOnScan && theme.accentGradient && theme.accentGradient.length >= 2 ? (
                    <LinearGradient
                      colors={theme.accentGradient as any}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.switchTrack, { borderWidth: 1, borderColor: theme.accent }]}
                    >
                      <View style={[styles.switchThumb, styles.switchThumbOn]} />
                    </LinearGradient>
                  ) : (
                    <View style={[styles.switchTrack, vibrateOnScan && { backgroundColor: theme.accent }]}>
                      <View style={[styles.switchThumb, vibrateOnScan && styles.switchThumbOn]} />
                    </View>
                  )}
                </Pressable>

                <View style={[styles.divider, { backgroundColor: theme.border }]} />

                <Pressable
                  style={styles.settingItem}
                  onPress={() => handleToggle('beepOnScan', !beepOnScan)}
                >
                  <View style={styles.settingLeft}>
                    <View style={[styles.iconWrapper, { backgroundColor: '#FF2D5520' }]}>
                      <Ionicons name="volume-high-outline" size={20} color="#FF2D55" />
                    </View>
                    <View style={styles.settingTextContainer}>
                      <Text style={[styles.settingText, { color: theme.text.primary }]}>
                        Sound Effects
                      </Text>
                      <Text style={[styles.settingHint, { color: theme.text.secondary }]}>
                        Play sound on successful scan
                      </Text>
                    </View>
                  </View>
                  {beepOnScan && theme.accentGradient && theme.accentGradient.length >= 2 ? (
                    <LinearGradient
                      colors={theme.accentGradient as any}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.switchTrack, { borderWidth: 1, borderColor: theme.accent }]}
                    >
                      <View style={[styles.switchThumb, styles.switchThumbOn]} />
                    </LinearGradient>
                  ) : (
                    <View style={[styles.switchTrack, beepOnScan && { backgroundColor: theme.accent }]}>
                    <View style={[styles.switchThumb, beepOnScan && styles.switchThumbOn]} />
                    </View>
                  )}
                </Pressable>

                <View style={[styles.divider, { backgroundColor: theme.border }]} />

                <Pressable
                  style={styles.settingItem}
                  onPress={() => handleToggle('autoCopyScanned', !autoCopyScanned)}
                >
                  <View style={styles.settingLeft}>
                    <View style={[styles.iconWrapper, { backgroundColor: '#007AFF20' }]}>
                      <Ionicons name="copy-outline" size={20} color="#007AFF" />
                    </View>
                    <View style={styles.settingTextContainer}>
                      <Text style={[styles.settingText, { color: theme.text.primary }]}>
                        Auto-copy Scanned Links
                      </Text>
                      <Text style={[styles.settingHint, { color: theme.text.secondary }]}>
                        Copy scanned URLs to clipboard
                      </Text>
                    </View>
                  </View>
                  {autoCopyScanned && theme.accentGradient && theme.accentGradient.length >= 2 ? (
                    <LinearGradient
                      colors={theme.accentGradient as any}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.switchTrack, { borderWidth: 1, borderColor: theme.accent }]}
                    >
                      <View style={[styles.switchThumb, styles.switchThumbOn]} />
                    </LinearGradient>
                  ) : (
                    <View style={[styles.switchTrack, autoCopyScanned && { backgroundColor: theme.accent }]}>
                    <View style={[styles.switchThumb, autoCopyScanned && styles.switchThumbOn]} />
                    </View>
                  )}
                </Pressable>
              </View>
            </View>

            {/* Navigation Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text.secondary }]}>
                NAVIGATION
              </Text>
              <View style={[styles.sectionContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Pressable
                  style={styles.settingItem}
                  onPress={() => handleToggle('swipeNavigation', !swipeNavigation)}
                >
                  <View style={styles.settingLeft}>
                    <View style={[styles.iconWrapper, { backgroundColor: '#5856D620' }]}>
                      <Ionicons name="swap-horizontal-outline" size={20} color="#5856D6" />
                    </View>
                    <View style={styles.settingTextContainer}>
                      <Text style={[styles.settingText, { color: theme.text.primary }]}>
                        Swipe Between Tabs
                      </Text>
                      <Text style={[styles.settingHint, { color: theme.text.secondary }]}>
                        Swipe left/right to switch tabs
                      </Text>
                    </View>
                  </View>
                  {swipeNavigation && theme.accentGradient && theme.accentGradient.length >= 2 ? (
                    <LinearGradient
                      colors={theme.accentGradient as any}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.switchTrack, { borderWidth: 1, borderColor: theme.accent }]}
                    >
                      <View style={[styles.switchThumb, styles.switchThumbOn]} />
                    </LinearGradient>
                  ) : (
                    <View style={[styles.switchTrack, swipeNavigation && { backgroundColor: theme.accent }]}>
                    <View style={[styles.switchThumb, swipeNavigation && styles.switchThumbOn]} />
                    </View>
                  )}
                </Pressable>
              </View>
            </View>

            {/* Features Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text.secondary }]}>
                FEATURES
              </Text>
              <View style={[styles.sectionContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Pressable
                  style={styles.settingItem}
                  onPress={() => handleToggle('showInsights', !showInsights)}
                >
                  <View style={styles.settingLeft}>
                    <View style={[styles.iconWrapper, { backgroundColor: '#FF950020' }]}>
                      <Ionicons name="analytics-outline" size={20} color="#FF9500" />
                    </View>
                    <View style={styles.settingTextContainer}>
                      <Text style={[styles.settingText, { color: theme.text.primary }]}>
                        Show Insights
                      </Text>
                      <Text style={[styles.settingHint, { color: theme.text.secondary }]}>
                        Display scan statistics in history
                      </Text>
                    </View>
                  </View>
                  {showInsights && theme.accentGradient && theme.accentGradient.length >= 2 ? (
                    <LinearGradient
                      colors={theme.accentGradient as any}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.switchTrack, { borderWidth: 1, borderColor: theme.accent }]}
                    >
                      <View style={[styles.switchThumb, styles.switchThumbOn]} />
                    </LinearGradient>
                  ) : (
                    <View style={[styles.switchTrack, showInsights && { backgroundColor: theme.accent }]}>
                    <View style={[styles.switchThumb, showInsights && styles.switchThumbOn]} />
                    </View>
                  )}
                </Pressable>
                <Pressable
                  style={styles.settingItem}
                  onPress={() => handleToggle('showSmartStart', !showSmartStart)}
                >
                  <View style={styles.settingLeft}>
                    <View style={[styles.iconWrapper, { backgroundColor: '#34C75920' }]}>
                      <Ionicons name="rocket-outline" size={20} color="#34C759" />
                    </View>
                    <View style={styles.settingTextContainer}>
                      <Text style={[styles.settingText, { color: theme.text.primary }]}>
                        Smart Start
                      </Text>
                      <Text style={[styles.settingHint, { color: theme.text.secondary }]}>
                        Detect clipboard content for quick QR generation
                      </Text>
                    </View>
                  </View>
                  {showSmartStart && theme.accentGradient && theme.accentGradient.length >= 2 ? (
                    <LinearGradient
                      colors={theme.accentGradient as any}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.switchTrack, { borderWidth: 1, borderColor: theme.accent }]}
                    >
                      <View style={[styles.switchThumb, styles.switchThumbOn]} />
                    </LinearGradient>
                  ) : (
                    <View style={[styles.switchTrack, showSmartStart && { backgroundColor: theme.accent }]}>
                    <View style={[styles.switchThumb, showSmartStart && styles.switchThumbOn]} />
                    </View>
                  )}
                </Pressable>
              </View>
            </View>

            {/* Privacy & Safety Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text.secondary }]}>
                PRIVACY & SAFETY
              </Text>
              <View style={[styles.sectionContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Pressable
                  style={styles.settingItem}
                  onPress={() => handleToggle('urlThreatScanning', !urlThreatScanning)}
                >
                  <View style={styles.settingLeft}>
                    <View style={[styles.iconWrapper, { backgroundColor: '#30D15820' }]}>
                      <Ionicons name="shield-checkmark-outline" size={20} color="#30D158" />
                    </View>
                    <View style={styles.settingTextContainer}>
                      <Text style={[styles.settingText, { color: theme.text.primary }]}>
                        URL Threat Scanning
                      </Text>
                      <Text style={[styles.settingHint, { color: theme.text.secondary }]}>
                        Check links for malicious content
                      </Text>
                    </View>
                  </View>
                  {urlThreatScanning && theme.accentGradient && theme.accentGradient.length >= 2 ? (
                    <LinearGradient
                      colors={theme.accentGradient as any}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.switchTrack, { borderWidth: 1, borderColor: theme.accent }]}
                    >
                      <View style={[styles.switchThumb, styles.switchThumbOn]} />
                    </LinearGradient>
                  ) : (
                    <View style={[styles.switchTrack, urlThreatScanning && { backgroundColor: theme.accent }]}>
                    <View style={[styles.switchThumb, urlThreatScanning && styles.switchThumbOn]} />
                    </View>
                  )}
                </Pressable>

                <View style={[styles.divider, { backgroundColor: theme.border }]} />

                <Pressable
                  style={styles.settingItem}
                  onPress={() => handleToggle('confirmDeleteHistory', !confirmDeleteHistory)}
                >
                  <View style={styles.settingLeft}>
                    <View style={[styles.iconWrapper, { backgroundColor: '#FF950020' }]}>
                      <Ionicons name="warning-outline" size={20} color="#FF9500" />
                    </View>
                    <View style={styles.settingTextContainer}>
                      <Text style={[styles.settingText, { color: theme.text.primary }]}>
                        Delete Confirmation
                      </Text>
                      <Text style={[styles.settingHint, { color: theme.text.secondary }]}>
                        Show confirmation before deleting history items
                      </Text>
                    </View>
                  </View>
                  {confirmDeleteHistory && theme.accentGradient && theme.accentGradient.length >= 2 ? (
                    <LinearGradient
                      colors={theme.accentGradient as any}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.switchTrack, { borderWidth: 1, borderColor: theme.accent }]}
                    >
                      <View style={[styles.switchThumb, styles.switchThumbOn]} />
                    </LinearGradient>
                  ) : (
                    <View style={[styles.switchTrack, confirmDeleteHistory && { backgroundColor: theme.accent }]}>
                    <View style={[styles.switchThumb, confirmDeleteHistory && styles.switchThumbOn]} />
                    </View>
                  )}
                </Pressable>

                <View style={[styles.divider, { backgroundColor: theme.border }]} />

                <Pressable
                  style={styles.settingItem}
                  onPress={handleClearHistory}
                >
                  <View style={styles.settingLeft}>
                    <View style={[styles.iconWrapper, { backgroundColor: '#FF3B3020' }]}>
                      <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                    </View>
                    <View style={styles.settingTextContainer}>
                      <Text style={[styles.settingText, { color: '#FF3B30' }]}>
                        Clear History
                      </Text>
                      <Text style={[styles.settingHint, { color: theme.text.secondary }]}>
                        Delete all saved scans
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.text.tertiary} />
                </Pressable>
              </View>
            </View>

            {/* Appearance Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text.secondary }]}>
                APPEARANCE
              </Text>
              <View style={[styles.sectionContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Pressable
                  style={styles.settingItem}
                  onPress={() => handleAppearanceChange('light')}
                >
                  <View style={styles.settingLeft}>
                    <View style={[styles.iconWrapper, { backgroundColor: '#FFCC0020' }]}>
                      <Ionicons name="sunny-outline" size={20} color="#FFCC00" />
                    </View>
                    <Text style={[styles.settingText, { color: theme.text.primary }]}>
                      Light Mode
                    </Text>
                  </View>
                  <View style={[styles.radio, appearance === 'light' && { borderColor: theme.accent }]}>
                    {appearance === 'light' && <View style={[styles.radioDot, { backgroundColor: theme.accent }]} />}
                  </View>
                </Pressable>

                <View style={[styles.divider, { backgroundColor: theme.border }]} />

                <Pressable
                  style={styles.settingItem}
                  onPress={() => handleAppearanceChange('dark')}
                >
                  <View style={styles.settingLeft}>
                    <View style={[styles.iconWrapper, { backgroundColor: '#5856D620' }]}>
                      <Ionicons name="moon-outline" size={20} color="#5856D6" />
                    </View>
                    <Text style={[styles.settingText, { color: theme.text.primary }]}>
                      Dark Mode
                    </Text>
                  </View>
                  <View style={[styles.radio, appearance === 'dark' && { borderColor: theme.accent }]}>
                    {appearance === 'dark' && <View style={[styles.radioDot, { backgroundColor: theme.accent }]} />}
                  </View>
                </Pressable>

                <View style={[styles.divider, { backgroundColor: theme.border }]} />

                <Pressable
                  style={styles.settingItem}
                  onPress={() => handleAppearanceChange('system')}
                >
                  <View style={styles.settingLeft}>
                    <View style={[styles.iconWrapper, { backgroundColor: '#8E8E9320' }]}>
                      <Ionicons name="phone-portrait-outline" size={20} color="#8E8E93" />
                    </View>
                    <Text style={[styles.settingText, { color: theme.text.primary }]}>
                      System Default
                    </Text>
                  </View>
                  <View style={[styles.radio, appearance === 'system' && { borderColor: theme.accent }]}>
                    {appearance === 'system' && <View style={[styles.radioDot, { backgroundColor: theme.accent }]} />}
                  </View>
                </Pressable>

                <View style={[styles.divider, { backgroundColor: theme.border }]} />

                <Pressable
                  style={styles.settingItem}
                  onPress={() => setAccentColorExpanded(!accentColorExpanded)}
                >
                  <View style={styles.settingLeft}>
                    <View style={[styles.iconWrapper, { backgroundColor: theme.accent + '20' }]}>
                      <Ionicons name="color-palette-outline" size={20} color={theme.accent} />
                    </View>
                    <View style={styles.settingTextContainer}>
                      <Text style={[styles.settingText, { color: theme.text.primary }]}>
                        Accent Color
                      </Text>
                      <Text style={[styles.settingHint, { color: theme.text.secondary }]}>
                        {accentColorLabels[accentColor] ?? accentColor.charAt(0).toUpperCase() + accentColor.slice(1)}
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name={accentColorExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={theme.text.tertiary}
                  />
                </Pressable>

                {accentColorExpanded && (
                  <View style={styles.colorPickerContainer}>
                    <ColorOrbitPicker
                      selectedColor={accentColor}
                      onSelect={handleAccentColorChange}
                    />
                  </View>
                )}
              </View>
            </View>

            {/* Debug Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text.secondary }]}>
                DEBUG
              </Text>
              <View style={[styles.sectionContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Pressable
                  style={styles.settingItem}
                  onPress={handleTestAudio}
                >
                  <View style={styles.settingLeft}>
                    <View style={[styles.iconWrapper, { backgroundColor: '#34C75920' }]}>
                      <Ionicons name="volume-high-outline" size={20} color="#34C759" />
                    </View>
                    <View style={styles.settingTextContainer}>
                      <Text style={[styles.settingText, { color: theme.text.primary }]}>
                        Test Audio
                      </Text>
                      <Text style={[styles.settingHint, { color: theme.text.secondary }]}>
                        Play scan success sound
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="play-outline" size={20} color={theme.text.tertiary} />
                </Pressable>

                <View style={[styles.divider, { backgroundColor: theme.border }]} />

                <Pressable
                  style={styles.settingItem}
                  onPress={handleTestHaptic}
                >
                  <View style={styles.settingLeft}>
                    <View style={[styles.iconWrapper, { backgroundColor: '#FF950020' }]}>
                      <Ionicons name="phone-portrait-outline" size={20} color="#FF9500" />
                    </View>
                    <View style={styles.settingTextContainer}>
                      <Text style={[styles.settingText, { color: theme.text.primary }]}>
                        Test Haptic
                      </Text>
                      <Text style={[styles.settingHint, { color: theme.text.secondary }]}>
                        Test vibration feedback
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="pulse-outline" size={20} color={theme.text.tertiary} />
                </Pressable>
              </View>
            </View>

            {/* About Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text.secondary }]}>
                ABOUT
              </Text>
              <View style={[styles.sectionContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.settingItem}>
                  <View style={styles.settingLeft}>
                    <View style={[styles.iconWrapper, { backgroundColor: '#0A84FF20' }]}>
                      <Ionicons name="information-circle-outline" size={20} color="#0A84FF" />
                    </View>
                    <Text style={[styles.settingText, { color: theme.text.primary }]}>
                      Version
                    </Text>
                  </View>
                  <Text style={[styles.settingValue, { color: theme.text.secondary }]}>
                    1.0.0
                  </Text>
                </View>
              </View>
            </View>

            {/* Reset Button */}
            <Pressable 
              style={[styles.supportButton, { borderColor: theme.border, backgroundColor: theme.surface }]} 
              onPress={handleOpenSupport}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={theme.accent} />
              <Text style={[styles.supportButtonText, { color: theme.text.primary }]}>Contact Support</Text>
            </Pressable>

            <Pressable 
              style={[styles.resetButton, { borderColor: theme.danger }]} 
              onPress={handleResetSettings}
            >
              <Ionicons name="refresh-outline" size={18} color="#FF3B30" />
              <Text style={styles.resetButtonText}>Reset All Settings</Text>
            </Pressable>

            <View style={styles.spacer} />
          </ScrollView>
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
        <SupportDialog
          visible={supportDialogVisible}
          onClose={() => setSupportDialogVisible(false)}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modal: {
    width: '88%',
    height: '80%',
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    minHeight: 200, // Add minimum height
    backgroundColor: 'transparent',
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 0,
  },
  sectionContent: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingText: {
    fontFamily: typography.fontFamily,
    fontSize: 15,
    fontWeight: '500',
    paddingRight: 8,
  },
  settingHint: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    marginTop: 2,
    paddingRight: 8,
  },
  settingValue: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
  },
  divider: {
    height: 0.5,
    marginLeft: 64,
  },
  colorPickerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  switchTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E5EA',
    padding: 2,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  switchThumbOn: {
    transform: [{ translateX: 20 }],
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  supportButtonText: {
    fontFamily: typography.fontFamily,
    fontSize: 15,
    fontWeight: '600',
  },
  resetButtonText: {
    fontFamily: typography.fontFamily,
    fontSize: 15,
    fontWeight: '500',
    color: '#FF3B30',
  },
  spacer: {
    height: 30,
  },
});
