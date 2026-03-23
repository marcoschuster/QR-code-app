import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Linking, StatusBar, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Reticle } from './Reticle';
import { parseQRCode } from '../../services/qrParser';
import { useHistoryStore } from '../../store/useHistoryStore';
import { useSettingsStore } from '../../store/useSettingsStore';

interface ScannerScreenProps {
  onResult: (data: any) => void;
  onSettingsPress?: () => void;
  onReset?: () => void;
}

export function ScannerScreen({ onResult, onSettingsPress, onReset }: ScannerScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [debugText, setDebugText] = useState('Waiting...');
  const { addItem } = useHistoryStore();
  const { saveToHistory } = useSettingsStore();

  useEffect(() => {
    console.log('[Scanner] mounted, permission state:', permission);
    setDebugText(`Permission: ${permission ? 'granted' : 'requesting'}`);
    if (permission === null) {
      console.log('[Scanner] requesting permission...');
      requestPermission();
    }
  }, [permission]);

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    console.log('[Scanner] ✅ BARCODE DETECTED:', data);
    setDebugText(`DETECTED: ${data}`);
    // REMOVED: Alert.alert('QR Code Detected!', data); // This was blocking!

    if (scanned) {
      console.log('[Scanner] already scanned, ignoring');
      setDebugText('Already scanned, ignoring');
      return;
    }

    setScanned(true);

    // Step 1: parse
    let parsed: any;
    try {
      parsed = parseQRCode(data);
      console.log('[Scanner] parsed type:', parsed.type, '| data:', JSON.stringify(parsed.data));
      setDebugText(`Parsed: ${parsed.type}`);
    } catch (e) {
      console.error('[Scanner] parseQRCode CRASHED:', e);
      parsed = { type: 'text', data: { text: data }, rawValue: data };
      setDebugText(`Parse error: ${e}`);
    }

    // Step 2: save to history (isolated — never blocks result)
    if (saveToHistory) {
      try {
        addItem({
          kind: 'scanned',
          type: parsed.type,
          rawValue: data,
          parsedData: parsed.data,
          safety: { checked: false, safe: null as boolean | null },
        });
        console.log('[Scanner] history saved OK');
        setDebugText('History saved');
      } catch (e) {
        console.warn('[Scanner] history save FAILED (non-fatal):', e);
        setDebugText(`History failed: ${e}`);
      }
    }

    // Step 3: fire result — this MUST always run
    console.log('[Scanner] calling onResult...');
    try {
      onResult({ ...parsed, safety: { checked: false, safe: null as boolean | null } });
      console.log('[Scanner] onResult called successfully');
      setDebugText('SUCCESS: Result sent!');
    } catch (e) {
      console.error('[Scanner] onResult CRASHED:', e);
      setDebugText(`onResult CRASHED: ${e}`);
    }
  };

  // Permission loading
  if (permission === null) {
    return (
      <View style={s.container}>
        <StatusBar hidden />
        <View style={s.center}>
          <Ionicons name="camera-outline" size={72} color="rgba(255,255,255,0.3)" />
          <Text style={s.title}>Requesting Camera...</Text>
        </View>
      </View>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <View style={s.container}>
        <StatusBar hidden />
        <View style={s.center}>
          <Ionicons name="camera-outline" size={72} color="#FF453A" />
          <Text style={s.title}>{permission.canAskAgain ? 'Camera Access Needed' : 'Camera Blocked'}</Text>
          <Text style={s.body}>
            {permission.canAskAgain
              ? 'Tap below to allow camera access.'
              : 'Go to Settings and enable camera access for this app.'}
          </Text>
          <Pressable
            style={s.btn}
            onPress={permission.canAskAgain ? requestPermission : () => Linking.openSettings()}
          >
            <Text style={s.btnTxt}>{permission.canAskAgain ? 'Allow Camera' : 'Open Settings'}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Camera ready
  return (
    <View style={s.container}>
      <StatusBar hidden />

      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torchOn}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'aztec', 'pdf417', 'datamatrix'],
        }}
      />

      <Reticle locked={scanned} />

      {/* DEBUG OVERLAY - shows what's happening */}
      <View style={s.debugOverlay}>
        <Text style={s.debugText}>{debugText}</Text>
      </View>

      {/* Top bar */}
      <View style={[s.topBar, { paddingTop: Platform.OS === 'ios' ? 56 : 36 }]}>
        <Pressable style={s.pill} onPress={() => setTorchOn(v => !v)}>
          <Ionicons name={torchOn ? 'flash' : 'flash-off'} size={22} color={torchOn ? '#FFD60A' : '#FFF'} />
        </Pressable>
        <View style={s.titlePill}>
          <Text style={s.titleTxt}>QR & Barcode</Text>
        </View>
        <Pressable style={s.pill} onPress={onSettingsPress}>
          <Ionicons name="settings-outline" size={22} color="#FFF" />
        </Pressable>
      </View>

      {/* Bottom */}
      <View style={s.bottom}>
        <Text style={s.hint}>Point at any code to scan</Text>
        <Pressable style={s.photosBtn} onPress={() => Alert.alert('Coming soon', 'Photo import next update.')}>
          <Ionicons name="images-outline" size={17} color="rgba(255,255,255,0.8)" />
          <Text style={s.photosTxt}>Scan from Photos</Text>
        </Pressable>
        
        {/* Scan Again Button */}
        {scanned && (
          <Pressable style={s.rescanBtn} onPress={() => {
            setScanned(false);
            onReset?.();
          }}>
            <Text style={s.rescanTxt}>Tap to Scan Again</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#FFF', textAlign: 'center' },
  body: { fontSize: 15, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 22 },
  btn: { backgroundColor: '#0A84FF', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, marginTop: 8 },
  btnTxt: { fontSize: 16, fontWeight: '600', color: '#FFF' },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 },
  pill: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  titlePill: { backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  titleTxt: { fontSize: 15, fontWeight: '600', color: '#FFF' },
  bottom: { position: 'absolute', bottom: 110, left: 0, right: 0, alignItems: 'center', gap: 14 },
  hint: { fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
  photosBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 20, paddingVertical: 11, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  photosTxt: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.85)' },
  debugOverlay: { position: 'absolute', top: 100, left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.8)', padding: 10, borderRadius: 8 },
  debugText: { color: '#00FF00', fontSize: 12, fontFamily: 'monospace' },
  rescanBtn: { backgroundColor: '#0A84FF', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 14, marginTop: 10 },
  rescanTxt: { color: '#FFF', fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
