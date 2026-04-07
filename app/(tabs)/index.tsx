import React, { useRef, useState } from 'react';
import { View, StyleSheet, StatusBar, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { ScannerScreen } from '../../components/scanner/CameraView';
import { ScanResultSheet } from '../../components/scanner/ScanResultSheet';
import { TabBar } from '../../components/ui/TabBar';
import { ScanSafetyState } from '../../constants/types';
import { useHistoryStore } from '../../store/useHistoryStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { checkUrlSafety, getThreatCheckSourceHint } from '../../services/threatCheck';

const MIN_THREAT_CHECK_INDICATOR_MS = 600;
const MAX_THREAT_CHECK_WAIT_MS = 3500;
const THREAT_CHECK_TIMEOUT_MESSAGE = 'Could not finish the threat check in time.';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resolveThreatCheck(url: string) {
  const result = await Promise.race([
    checkUrlSafety(url).then((safety) => ({ kind: 'resolved' as const, safety })),
    sleep(MAX_THREAT_CHECK_WAIT_MS).then(() => ({ kind: 'timeout' as const })),
  ]);

  return result;
}

export default function ScannerTab() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('scan');
  const [scanResult, setScanResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);
  const [scannerKey, setScannerKey] = useState(0);
  const threatCheckRunRef = useRef(0);
  const updateItem = useHistoryStore((state) => state.updateItem);
  const { urlThreatScanning } = useSettingsStore();

  const handleScanResult = async (data: any) => {
    console.log('[index] handleScanResult called, type:', data?.type);

    const requiresThreatCheck =
      data.type === 'url' &&
      urlThreatScanning &&
      (!data.safety || !data.safety.checked);

    if (!requiresThreatCheck) {
      setScanResult(data);
      setShowResult(true);
      console.log('[index] showResult set to true');
      return;
    }

    const requestId = ++threatCheckRunRef.current;
    const pendingSafety: ScanSafetyState = {
      checked: false,
      safe: null,
      inProgress: true,
      source: data.safety?.source || getThreatCheckSourceHint(),
    };
    const pendingResult = { ...data, safety: pendingSafety };

    setScanResult(pendingResult);
    setShowResult(true);
    console.log('[index] showResult set to true');

    try {
      const [result] = await Promise.all([
        resolveThreatCheck(data.data.url),
        sleep(MIN_THREAT_CHECK_INDICATOR_MS),
      ]);

      if (threatCheckRunRef.current !== requestId) {
        return;
      }

      if (result.kind === 'timeout') {
        const timeoutSafety: ScanSafetyState = {
          ...pendingSafety,
          inProgress: false,
          error: THREAT_CHECK_TIMEOUT_MESSAGE,
        };

        setScanResult({ ...pendingResult, safety: timeoutSafety });

        if (data.historyItemId) {
          updateItem(data.historyItemId, { safety: timeoutSafety });
        }
        return;
      }

      const safety = result.safety;
      const resolvedSafety: ScanSafetyState = {
        checked: true,
        safe: safety.safe,
        threatType: safety.threatType,
        confidence: safety.confidence,
        source: safety.source,
        checkedAt: Date.now(),
        inProgress: false,
      };

      setScanResult({ ...pendingResult, safety: resolvedSafety });

      if (data.historyItemId) {
        updateItem(data.historyItemId, { safety: resolvedSafety });
      }
    } catch (error) {
      console.warn('Safety check failed:', error);

      if (threatCheckRunRef.current !== requestId) {
        return;
      }

      const failedSafety: ScanSafetyState = {
        ...pendingSafety,
        inProgress: false,
        error: 'Threat check failed.',
      };

      setScanResult({ ...pendingResult, safety: failedSafety });

      if (data.historyItemId) {
        updateItem(data.historyItemId, { safety: failedSafety });
      }
    }
  };

  const handleReset = () => {
    console.log('[index] resetting scanner');
    threatCheckRunRef.current += 1;
    setScanResult(null);
    setScannerKey(prev => prev + 1);
  };

  const handleCloseResult = () => {
    console.log('[index] closing result sheet');
    threatCheckRunRef.current += 1;
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
