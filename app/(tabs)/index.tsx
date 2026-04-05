import React, { useState, useEffect } from 'react';
import { View, StyleSheet, StatusBar, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { ScannerScreen } from '../../components/scanner/CameraView';
import { ScanResultSheet } from '../../components/scanner/ScanResultSheet';
import { TabBar } from '../../components/ui/TabBar';
import { useSettingsStore } from '../../store/useSettingsStore';
import { checkUrlSafety } from '../../services/threatCheck';

export default function ScannerTab() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('scan');
  const [scanResult, setScanResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);
  const [scannerKey, setScannerKey] = useState(0);
  const { urlThreatScanning } = useSettingsStore();

  const handleScanResult = async (data: any) => {
    console.log('[index] handleScanResult called, type:', data?.type);
    
    // Perform safety check if it's a URL and setting is enabled
    if (data.type === 'url' && urlThreatScanning && (!data.safety || !data.safety.checked)) {
      try {
        const safety = await checkUrlSafety(data.data.url);
        data = { ...data, safety: { checked: true, ...safety } };
      } catch (error) {
        console.warn('Safety check failed:', error);
      }
    }
    
    setScanResult(data);
    setShowResult(true);
    console.log('[index] showResult set to true');
  };

  const handleReset = () => {
    console.log('[index] resetting scanner');
    setScanResult(null);
    setScannerKey(prev => prev + 1);
  };

  const handleCloseResult = () => {
    console.log('[index] closing result sheet');
    setShowResult(false);
    setTimeout(() => {
      setScanResult(null);
      setScannerKey(prev => prev + 1);
    }, 300);
  };

  const handleTabChange = (tab: string) => {
    if (tab === 'generate') { router.push('/(tabs)/generate'); return; }
    if (tab === 'history') { router.push('/(tabs)/history'); return; }
    setActiveTab(tab);
  };

  return (
    <View style={st.root}>
      <StatusBar hidden />

      {activeTab === 'scan' && (
        <ScannerScreen
          key={scannerKey}
          onResult={handleScanResult}
          onReset={handleReset}
          onSettingsPress={() => router.push('/settings')}
        />
      )}

      <Modal
        visible={showResult && scanResult !== null}
        animationType="slide"
        onRequestClose={handleCloseResult}
        transparent={true}
      >
        <View style={st.modalOverlay}>
          {scanResult ? (
            <ScanResultSheet 
              visible={showResult} 
              data={scanResult} 
              onClose={handleCloseResult} 
            />
          ) : null}
        </View>
      </Modal>

      <TabBar activeTab={activeTab} onTabChange={handleTabChange} />
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
});
