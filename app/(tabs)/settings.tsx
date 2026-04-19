import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useHistoryStore } from '../../store/useHistoryStore';
import { lightTheme, darkTheme, spacing, borderRadius, typography } from '../../constants/theme';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

console.log('========== SETTINGS.TSX LOADED ==========');

export default function SettingsScreen() {
  console.log('[Settings] SettingsScreen mounting');
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const router = useRouter();
  const { clearAll } = useHistoryStore();
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
    autoOpenUrls,
    saveToHistory,
    vibrateOnScan,
    beepOnScan,
    urlThreatScanning,
    autoCopyScanned,
    swipeNavigation,
    showInsights,
    showSmartStart,
    updateSettings,
    resetSettings,
  } = useSettingsStore();

  console.log('[Settings] autoCopyScanned:', autoCopyScanned);
  console.log('[Settings] swipeNavigation:', swipeNavigation);

  const handleAppearanceChange = (value: 'light' | 'dark' | 'system') => {
    updateSettings({ appearance: value });
  };

  const handleToggle = (key: string, value: boolean) => {
    updateSettings({ [key]: value });
  };

  const handleClearHistory = () => {
    setConfirmDialog({
      visible: true,
      title: 'Clear History',
      message: 'Are you sure you want to clear all scan history? This action cannot be undone.',
      confirmLabel: 'Clear',
      onConfirm: () => {
        clearAll();
        setConfirmDialog(prev => ({ ...prev, visible: false }));
        setTimeout(() => {
          Alert.alert('History Cleared', 'All scan history has been cleared.');
        }, 300);
      },
      isDestructive: true,
    });
  };

  const handleResetSettings = () => {
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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={theme.text.primary} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text.primary }]}>Settings (UPDATED)</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Appearance */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
            Appearance
          </Text>
          <View style={[styles.sectionContent, { backgroundColor: theme.surface }]}>
            <Pressable
              style={styles.settingItem}
              onPress={() => handleAppearanceChange('light')}
            >
              <View style={styles.settingLeft}>
                <Ionicons name="sunny-outline" size={20} color={theme.text.primary} />
                <Text style={[styles.settingText, { color: theme.text.primary }]}>
                  Light
                </Text>
              </View>
              <View style={[styles.radio, appearance === 'light' && { backgroundColor: theme.accent }]}>
                {appearance === 'light' && (
                  <View style={[styles.radioDot, { backgroundColor: '#FFFFFF' }]} />
                )}
              </View>
            </Pressable>
            
            <Pressable
              style={styles.settingItem}
              onPress={() => handleAppearanceChange('dark')}
            >
              <View style={styles.settingLeft}>
                <Ionicons name="moon-outline" size={20} color={theme.text.primary} />
                <Text style={[styles.settingText, { color: theme.text.primary }]}>
                  Dark
                </Text>
              </View>
              <View style={[styles.radio, appearance === 'dark' && { backgroundColor: theme.accent }]}>
                {appearance === 'dark' && (
                  <View style={[styles.radioDot, { backgroundColor: '#FFFFFF' }]} />
                )}
              </View>
            </Pressable>
            
            <Pressable
              style={styles.settingItem}
              onPress={() => handleAppearanceChange('system')}
            >
              <View style={styles.settingLeft}>
                <Ionicons name="phone-portrait-outline" size={20} color={theme.text.primary} />
                <Text style={[styles.settingText, { color: theme.text.primary }]}>
                  System
                </Text>
              </View>
              <View style={[styles.radio, appearance === 'system' && { backgroundColor: theme.accent }]}>
                {appearance === 'system' && (
                  <View style={[styles.radioDot, { backgroundColor: '#FFFFFF' }]} />
                )}
              </View>
            </Pressable>
          </View>
        </View>

        {/* Scanning */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
            Scanning
          </Text>
          <View style={[styles.sectionContent, { backgroundColor: theme.surface }]}>
            <Pressable
              style={styles.settingItem}
              onPress={() => handleToggle('autoOpenUrls', !autoOpenUrls)}
            >
              <View style={styles.settingLeft}>
                <Ionicons name="globe-outline" size={20} color={theme.text.primary} />
                <Text style={[styles.settingText, { color: theme.text.primary }]}>
                  Auto-open URLs
                </Text>
              </View>
              <View style={[styles.switch, autoOpenUrls && { backgroundColor: theme.accent }]}>
                <View style={[styles.switchThumb, autoOpenUrls && styles.switchThumbOn]} />
              </View>
            </Pressable>
            
            <Pressable
              style={styles.settingItem}
              onPress={() => handleToggle('saveToHistory', !saveToHistory)}
            >
              <View style={styles.settingLeft}>
                <Ionicons name="time-outline" size={20} color={theme.text.primary} />
                <Text style={[styles.settingText, { color: theme.text.primary }]}>
                  Save to History (TEST)
                </Text>
              </View>
              <View style={[styles.switch, saveToHistory && { backgroundColor: theme.accent }]}>
                <View style={[styles.switchThumb, saveToHistory && styles.switchThumbOn]} />
              </View>
            </Pressable>
            
            <Pressable
              style={styles.settingItem}
              onPress={() => handleToggle('vibrateOnScan', !vibrateOnScan)}
            >
              <View style={styles.settingLeft}>
                <Ionicons name="phone-portrait-outline" size={20} color={theme.text.primary} />
                <Text style={[styles.settingText, { color: theme.text.primary }]}>
                  Vibrate on Scan
                </Text>
              </View>
              <View style={[styles.switch, vibrateOnScan && { backgroundColor: theme.accent }]}>
                <View style={[styles.switchThumb, vibrateOnScan && styles.switchThumbOn]} />
              </View>
            </Pressable>
            
            <Pressable
              style={styles.settingItem}
              onPress={() => handleToggle('autoCopyScanned', !autoCopyScanned)}
            >
              <View style={styles.settingLeft}>
                <Ionicons name="copy-outline" size={20} color={theme.text.primary} />
                <Text style={[styles.settingText, { color: theme.text.primary }]}>
                  Auto-copy Scanned Links
                </Text>
              </View>
              <View style={[styles.switch, autoCopyScanned && { backgroundColor: theme.accent }]}>
                <View style={[styles.switchThumb, autoCopyScanned && styles.switchThumbOn]} />
              </View>
            </Pressable>
          </View>
        </View>

        {/* Navigation */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
            Navigation
          </Text>
          <View style={[styles.sectionContent, { backgroundColor: theme.surface }]}>
            <Pressable
              style={styles.settingItem}
              onPress={() => handleToggle('swipeNavigation', !swipeNavigation)}
            >
              <View style={styles.settingLeft}>
                <Ionicons name="swap-horizontal-outline" size={20} color={theme.text.primary} />
                <Text style={[styles.settingText, { color: theme.text.primary }]}>
                  Swipe Between Tabs
                </Text>
              </View>
              <View style={[styles.switch, swipeNavigation && { backgroundColor: theme.accent }]}>
                <View style={[styles.switchThumb, swipeNavigation && styles.switchThumbOn]} />
              </View>
            </Pressable>
          </View>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
            Features
          </Text>
          <View style={[styles.sectionContent, { backgroundColor: theme.surface }]}>
            <Pressable
              style={styles.settingItem}
              onPress={() => handleToggle('showInsights', !showInsights)}
            >
              <View style={styles.settingLeft}>
                <Ionicons name="analytics-outline" size={20} color={theme.text.primary} />
                <Text style={[styles.settingText, { color: theme.text.primary }]}>
                  Show Insights
                </Text>
              </View>
              <View style={[styles.switch, showInsights && { backgroundColor: theme.accent }]}>
                <View style={[styles.switchThumb, showInsights && styles.switchThumbOn]} />
              </View>
            </Pressable>
            <Pressable
              style={styles.settingItem}
              onPress={() => handleToggle('showSmartStart', !showSmartStart)}
            >
              <View style={styles.settingLeft}>
                <Ionicons name="rocket-outline" size={20} color={theme.text.primary} />
                <Text style={[styles.settingText, { color: theme.text.primary }]}>
                  Smart Start
                </Text>
              </View>
              <View style={[styles.switch, showSmartStart && { backgroundColor: theme.accent }]}>
                <View style={[styles.switchThumb, showSmartStart && styles.switchThumbOn]} />
              </View>
            </Pressable>
          </View>
        </View>

        {/* Privacy & Safety */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
            Privacy & Safety
          </Text>
          <View style={[styles.sectionContent, { backgroundColor: theme.surface }]}>
            <Pressable
              style={styles.settingItem}
              onPress={() => handleToggle('urlThreatScanning', !urlThreatScanning)}
            >
              <View style={styles.settingLeft}>
                <Ionicons name="shield-checkmark-outline" size={20} color={theme.text.primary} />
                <Text style={[styles.settingText, { color: theme.text.primary }]}>
                  URL Threat Scanning
                </Text>
              </View>
              <View style={[styles.switch, urlThreatScanning && { backgroundColor: theme.accent }]}>
                <View style={[styles.switchThumb, urlThreatScanning && styles.switchThumbOn]} />
              </View>
            </Pressable>
            
            <Pressable
              style={styles.settingItem}
              onPress={handleClearHistory}
            >
              <View style={styles.settingLeft}>
                <Ionicons name="trash-outline" size={20} color={theme.danger} />
                <Text style={[styles.settingText, { color: theme.danger }]}>
                  Clear History
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.text.tertiary} />
            </Pressable>
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
            About
          </Text>
          <View style={[styles.sectionContent, { backgroundColor: theme.surface }]}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="information-circle-outline" size={20} color={theme.text.primary} />
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

        <View style={styles.spacer} />
      </ScrollView>

      <ConfirmDialog
        visible={confirmDialog.visible}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, visible: false }))}
        isDestructive={confirmDialog.isDestructive}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
  },
  placeholder: {
    width: 24,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.tight,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionContent: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  settingText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.base,
  },
  settingValue: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E5E5E7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  switch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E5E7',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 2,
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  switchThumbOn: {
    transform: [{ translateX: -20 }],
  },
  spacer: {
    height: spacing.xxl,
  },
});
