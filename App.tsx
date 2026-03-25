import React, { useState } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { useColorScheme } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ScannerScreen } from './components/scanner/CameraView';
import { ScanResultSheet } from './components/scanner/ScanResultSheet';
import { TabBar } from './components/ui/TabBar';
import { HistoryScreen } from './components/ui/HistoryScreen';
import { SettingsScreen } from './components/ui/SettingsScreen';
import { QRCodeData } from './constants/types';
import { lightTheme, darkTheme } from './constants/theme';

export default function App() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  const [activeTab, setActiveTab] = useState('scan');
  const [scanResult, setScanResult] = useState<QRCodeData | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [scannerKey, setScannerKey] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  const handleScanResult = (data: QRCodeData) => {
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
