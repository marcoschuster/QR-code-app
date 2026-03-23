import React, { useState } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { useColorScheme } from 'react-native';
import { ScannerScreen } from './components/scanner/CameraView';
import { ScanResultSheet } from './components/scanner/ScanResultSheet';
import { TabBar } from './components/ui/TabBar';
import { QRCodeData } from './constants/types';
import { lightTheme, darkTheme } from './constants/theme';

export default function App() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  const [activeTab, setActiveTab] = useState('scan');
  const [scanResult, setScanResult] = useState<QRCodeData | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [scannerKey, setScannerKey] = useState(0);

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
          />
        </View>
      )}
      
      {activeTab === 'generate' && (
        <View style={[styles.tabContent, styles.placeholder, { backgroundColor: theme.background }]} />
      )}
      
      {activeTab === 'history' && (
        <View style={[styles.tabContent, styles.placeholder, { backgroundColor: theme.background }]} />
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
