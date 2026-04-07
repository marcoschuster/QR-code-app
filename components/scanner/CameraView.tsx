import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Linking, StatusBar, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Reticle } from './Reticle';
import { PhotoScanner } from './PhotoScanner';
import { parseQRCode } from '../../services/qrParser';
import { getThreatCheckSourceHint } from '../../services/threatCheck';
import { useHistoryStore } from '../../store/useHistoryStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useScanAudio } from '../../hooks/useScanAudio';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface ScannerScreenProps {
  onResult: (data: any) => void;
  onSettingsPress?: () => void;
  onReset?: () => void;
}

let lastKnownCameraPermissionGranted = false;

export function ScannerScreen({ onResult, onSettingsPress, onReset }: ScannerScreenProps) {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [targetBounds, setTargetBounds] = useState<{origin: {x: number; y: number}; size: {width: number; height: number}} | null>(null);
  const [isLocking, setIsLocking] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showPhotoScanner, setShowPhotoScanner] = useState(false);
  const [showLimitReached, setShowLimitReached] = useState(false);
  const photoScanSucceededRef = useRef(false);
  const { addItem } = useHistoryStore();
  const { saveToHistory, beepOnScan, vibrateOnScan, urlThreatScanning } = useSettingsStore();
  const { playScanSound } = useScanAudio();

  useEffect(() => {
    if (permission?.granted) {
      lastKnownCameraPermissionGranted = true;
    }
  }, [permission?.granted]);

  // ── Barcode scan handler ───────────────────────────────────────────────────
  const handleBarcodeScanned = async (result: { data: string; bounds?: {origin: {x: number; y: number}; size: {width: number; height: number}} }) => {
    if (scanned) return;

    // 1. Start the lock animation FIRST
    if (result.bounds) {
      setTargetBounds(result.bounds);
      setIsLocking(true);
      
      // 2. Wait for animation to complete before showing result
      await new Promise(resolve => setTimeout(resolve, 450));
    }

    // 3. Now set scanned to true (hides camera, shows result)
    setScanned(true);

    // Fire feedback without blocking scan result rendering.
    if (beepOnScan) {
      void playScanSound().catch((error) => {
        console.warn('[Scanner] audio feedback failed:', error);
      });
    }
    
    if (vibrateOnScan) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch((error) => {
        console.warn('[Scanner] haptic feedback failed:', error);
      });
    }

    let parsed: any;
    try {
      parsed = parseQRCode(result.data);
    } catch (e) {
      parsed = { type: 'text', data: { text: result.data }, rawValue: result.data };
    }

    const initialSafety =
      parsed.type === 'url' && urlThreatScanning
        ? {
            checked: false,
            safe: null as boolean | null,
            inProgress: true,
            source: getThreatCheckSourceHint(),
          }
        : {
            checked: false,
            safe: null as boolean | null,
            inProgress: false,
          };

    let historyItemId: string | undefined;

    if (saveToHistory) {
      try {
        const saveResult = addItem({
          kind: 'scanned',
          type: parsed.type,
          rawValue: result.data,
          parsedData: parsed.data,
          safety: initialSafety,
        });
        historyItemId = saveResult.itemId;
        
        if (!saveResult.saved) {
          setShowLimitReached(true);
        }
      } catch (e) {
        console.warn('[Scanner] history save failed:', e);
      }
    }

    try {
      onResult({ ...parsed, safety: initialSafety, historyItemId });
    } catch (e) {
      console.error('[Scanner] onResult crashed:', e);
    }
  };

  // ── Photo scan handler ──
  const handleScanFromPhotos = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });
      if (result.canceled) return;
      
      photoScanSucceededRef.current = false;
      setScanned(true);
      setTargetBounds(null);
      setIsLocking(false);
      setSelectedImage(result.assets[0].uri);
      setShowPhotoScanner(true);
    } catch (err) {
      Alert.alert('Error', 'Failed to open photo library.');
    }
  };

  // ── Permission loading ─────────────────────────────────────────────────────
  if (permission === null && !lastKnownCameraPermissionGranted) {
    return (
      <View style={s.container}>
        <StatusBar hidden />
        <View style={s.center}>
          <Ionicons name="camera-outline" size={72} color="rgba(255,255,255,0.3)" />
          <Text style={s.title}>Requesting Camera…</Text>
          <Pressable style={s.btn} onPress={requestPermission}>
            <Text style={s.btnTxt}>Grant Permission</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Permission denied ──────────────────────────────────────────────────────
  if (permission && !permission.granted) {
    return (
      <View style={s.container}>
        <StatusBar hidden />
        <View style={s.center}>
          <Ionicons name="camera-outline" size={72} color="#FF453A" />
          <Text style={s.title}>
            {permission.canAskAgain ? 'Camera Access Needed' : 'Camera Blocked'}
          </Text>
          <Text style={s.body}>
            {permission.canAskAgain
              ? 'Tap below to allow camera access.'
              : 'Go to Settings and enable camera access for this app.'}
          </Text>
          <Pressable
            style={s.btn}
            onPress={permission.canAskAgain ? requestPermission : () => Linking.openSettings()}
          >
            <Text style={s.btnTxt}>
              {permission.canAskAgain ? 'Allow Camera' : 'Open Settings'}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Camera ready ───────────────────────────────────────────────────────────
  return (
    <View style={s.container}>
      <StatusBar hidden />

      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torchOn}
        onBarcodeScanned={scanned || showPhotoScanner ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: [
            'qr', 'ean13', 'ean8', 'upc_a', 'upc_e',
            'code128', 'code39', 'aztec', 'pdf417', 'datamatrix',
          ],
        }}
      />

      {/* Reticle — hidden once scanned so it vanishes when result sheet opens */}
      {!scanned && !showPhotoScanner && <Reticle targetBounds={targetBounds} isLocking={isLocking} />}

      {/* Top bar */}
      <View style={[s.topBar, { paddingTop: Platform.OS === 'ios' ? 56 : 36 }]}>
        <Pressable style={s.pill} onPress={() => setTorchOn(v => !v)}>
          <Ionicons
            name={torchOn ? 'flash' : 'flash-off'}
            size={22}
            color={torchOn ? '#FFD60A' : '#FFF'}
          />
        </Pressable>

        <View style={s.titlePill}>
          <Text style={s.titleTxt}>QR & Barcode</Text>
        </View>

        {/* Settings button */}
        <Pressable style={s.pill} onPress={() => {
          if (onSettingsPress) {
            onSettingsPress();
          } else {
            router.push('/settings');
          }
        }}>
          <Ionicons name="settings-outline" size={22} color="#FFF" />
        </Pressable>
      </View>

      {/* Bottom — button sits above the tab bar */}
      <View style={s.bottom}>
        <Text style={s.hint}>Point at any code to scan</Text>

        <Pressable style={s.photosBtn} onPress={handleScanFromPhotos}>
          <Ionicons name="images-outline" size={17} color="rgba(255,255,255,0.8)" />
          <Text style={s.photosTxt}>Scan from Photos</Text>
        </Pressable>

        {scanned && (
          <Pressable
            style={s.rescanBtn}
            onPress={() => {
              setScanned(false);
              setTargetBounds(null);
              setIsLocking(false);
              onReset?.();
            }}
          >
            <Text style={s.rescanTxt}>Tap to Scan Again</Text>
          </Pressable>
        )}
      </View>

      {/* Photo Scanner Modal */}
      <PhotoScanner
        visible={showPhotoScanner}
        imageUri={selectedImage || ''}
        onClose={() => {
          setShowPhotoScanner(false);
          setSelectedImage(null);
          if (!photoScanSucceededRef.current) {
            setScanned(false);
            setTargetBounds(null);
            setIsLocking(false);
          }
        }}
        onResult={(data) => {
          photoScanSucceededRef.current = true;
          setScanned(true);
          onResult(data);
        }}
      />

      <ConfirmDialog
        visible={showLimitReached}
        title="Limit Reached"
        message="This scan has been saved 99 times already and won't be saved again."
        confirmLabel="OK"
        onConfirm={() => setShowLimitReached(false)}
        onCancel={() => setShowLimitReached(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#000' },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 16 },
  title:      { fontSize: 24, fontWeight: '700', color: '#FFF', textAlign: 'center' },
  body:       { fontSize: 15, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 22 },
  btn:        { backgroundColor: '#0A84FF', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, marginTop: 8 },
  btnTxt:     { fontSize: 16, fontWeight: '600', color: '#FFF' },
  topBar:     { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 },
  pill:       { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  titlePill:  { backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  titleTxt:   { fontSize: 15, fontWeight: '600', color: '#FFF' },
  // bottom: sits high enough to clear the floating tab bar (height ~80) + its bottom offset (24)
  bottom:     { position: 'absolute', bottom: 160, left: 0, right: 0, alignItems: 'center', gap: 14 },
  hint:       { fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
  photosBtn:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 20, paddingVertical: 11, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  photosTxt:  { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.85)' },
  rescanBtn:  { backgroundColor: '#0A84FF', paddingVertical: 12, paddingHorizontal: 28, borderRadius: 14 },
  rescanTxt:  { color: '#FFF', fontSize: 14, fontWeight: '600' },
});
