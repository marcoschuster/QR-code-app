import React, { useState } from 'react';
import { View, StyleSheet, StatusBar, Linking } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ScannerScreen } from './components/scanner/CameraView';
import { ScanResultSheet } from './components/scanner/ScanResultSheet';
import { TabBar } from './components/ui/TabBar';
import { HistoryScreen } from './components/ui/HistoryScreen';
import { SettingsScreen } from './components/ui/SettingsScreen';
import { QrGeneratorContent } from './components/generator/QrGeneratorContent';
import { QRCodeData } from './constants/types';
import { useSettingsStore } from './store/useSettingsStore';

export default function App() {
  const [activeTab, setActiveTab] = useState('scan');
  const [scanResult, setScanResult] = useState<QRCodeData | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [scannerKey, setScannerKey] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  const { vibrateOnScan, autoOpenUrls } = useSettingsStore();

  const handleScanResult = (data: QRCodeData) => {
    // Haptic feedback - use MEDIUM for successful scan
    if (vibrateOnScan) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Auto-open URLs with delay
    if (autoOpenUrls && data.type === 'url' && data.data.url) {
      setTimeout(() => {
        Linking.openURL(data.data.url);
      }, 500); // Small delay to let user see the result first
    }

    setScanResult(data);
    setShowResult(true);
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
        <View style={styles.tabContent}>
          <QrGeneratorContent />
        </View>
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
});
