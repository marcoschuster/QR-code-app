import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, StatusBar, Linking } from 'react-native';
import { useColorScheme } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Audio from 'expo-av';
import { ScannerScreen } from './components/scanner/CameraView';
import { ScanResultSheet } from './components/scanner/ScanResultSheet';
import { TabBar } from './components/ui/TabBar';
import { HistoryScreen } from './components/ui/HistoryScreen';
import { SettingsScreen } from './components/ui/SettingsScreen';
import { QRCodeData } from './constants/types';
import { lightTheme, darkTheme } from './constants/theme';
import { useSettingsStore } from './store/useSettingsStore';

export default function App() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  const [activeTab, setActiveTab] = useState('scan');
  const [scanResult, setScanResult] = useState<QRCodeData | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [scannerKey, setScannerKey] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  const { vibrateOnScan, beepOnScan, autoOpenUrls } = useSettingsStore();

  const handleScanResult = (data: QRCodeData) => {
    // Haptic feedback
    if (vibrateOnScan) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Sound feedback
    if (beepOnScan) {
      playScanSound();
    }

    // Auto-open URLs
    if (autoOpenUrls && data.type === 'url' && data.data.url) {
      setTimeout(() => {
        Linking.openURL(data.data.url);
      }, 500);
    }

    setScanResult(data);
    setShowResult(true);
  };

  const playScanSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('./assets/sounds/scan-success.mp3'),
        { shouldPlay: true }
      );
      await sound.playAsync();
      await sound.unloadAsync();
    } catch (error) {
      console.log('Sound play error:', error);
    }
  };

  const handleCloseResult = () => {
    setShowResult(false);
    setScanResult(null);
    setScannerKey(k => k + 1);
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      {activeTab === 'scan' && (
        <View style={styles.tabContent}>
          <ScannerScreen
            key={scannerKey}
            onResult={handleScanResult}
            onSettingsPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowSettings(true);
            }}
          />
        </View>
      )}
      
      {activeTab === 'generate' && (
        <View style={[styles.tabContent, styles.placeholder, { backgroundColor: theme.background }]} />
      )}
      
      {activeTab === 'history' && (
        <View style={styles.tabContent}>
          <HistoryScreen />
        </View>
      )}

      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {showResult && scanResult && (
        <View style={StyleSheet.absoluteFill}>
          <ScanResultSheet
            visible={showResult}
            onClose={handleCloseResult}
            data={scanResult}
          />
        </View>
      )}

      {showSettings && (
        <SettingsScreen 
          visible={showSettings} 
          onClose={() => setShowSettings(false)} 
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  tabContent: {
    flex: 1,
  },
  placeholder: {
    backgroundColor: '#F5F5F7',
  },
});
