import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Linking, StatusBar, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Reticle } from './Reticle';
import { PhotoScanner } from './PhotoScanner';
import { parseQRCode } from '../../services/qrParser';
import { useHistoryStore } from '../../store/useHistoryStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useScanAudio } from '../../hooks/useScanAudio';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';

interface ScannerScreenProps {
  onResult: (data: any) => void;
  onSettingsPress?: () => void;
  onReset?: () => void;
}

export function ScannerScreen({ onResult, onSettingsPress, onReset }: ScannerScreenProps) {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [targetBounds, setTargetBounds] = useState<{origin: {x: number; y: number}; size: {width: number; height: number}} | null>(null);
  const [isLocking, setIsLocking] = useState(false);
  const [isPickingPhoto, setIsPickingPhoto] = useState(false);
  const [photoScannerVisible, setPhotoScannerVisible] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const { addItem } = useHistoryStore();
  const { saveToHistory, beepOnScan, vibrateOnScan } = useSettingsStore();
  const { playScanSound } = useScanAudio();
  const isPhotoFlowActive = isPickingPhoto || photoScannerVisible;
  const cameraVisible = permission?.granted === true && !isPhotoFlowActive && !scanned;

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

    // Play audio feedback
    if (beepOnScan) {
      await playScanSound();
    }
    
    // Play haptic feedback
    if (vibrateOnScan) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    let parsed: any;
    try {
      parsed = parseQRCode(result.data);
    } catch (e) {
      parsed = { type: 'text', data: { text: result.data }, rawValue: result.data };
    }

    if (saveToHistory) {
      try {
        addItem({
          kind: 'scanned',
          type: parsed.type,
          rawValue: result.data,
          parsedData: parsed.data,
          safety: { checked: false, safe: null as boolean | null },
        });
      } catch (e) {
        console.warn('[Scanner] history save failed:', e);
      }
    }

    try {
      onResult({ ...parsed, safety: { checked: false, safe: null as boolean | null } });
    } catch (e) {
      console.error('[Scanner] onResult crashed:', e);
    }
  };

  // ── Photo scan handler ────────────────────────────────────────────────────────
  const handleScanFromPhotos = async () => {
    setTorchOn(false);
    setIsPickingPhoto(true);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });
      if (result.canceled) return;

      const selectedAsset = result.assets[0];
      setSelectedImageUri(selectedAsset.uri);
      setPhotoScannerVisible(true);
      
    } catch (err) {
      console.error('Photo scan error:', err);
      // Don't show alert if activity is not available
      try {
        Alert.alert('Error', 'Failed to open photo library. Please try again.');
      } catch (alertErr) {
        console.warn('[CameraView] Could not show alert:', alertErr);
      }
    } finally {
      setIsPickingPhoto(false);
    }
  };

  // ── Photo scanner handlers ───────────────────────────────────────────────────
  const handlePhotoScannerClose = () => {
    setPhotoScannerVisible(false);
    setSelectedImageUri(null);
  };

  const handlePhotoScannerResult = (result: any) => {
    setScanned(true);
    setTorchOn(false);
    setTargetBounds(null);
    setIsLocking(false);
    onResult(result);
  };

  const renderCameraFallback = () => {
    if (cameraVisible || isPhotoFlowActive || scanned) {
      return null;
    }

    if (permission === null) {
      return (
        <View style={s.center}>
          <Ionicons name="camera-outline" size={72} color="rgba(255,255,255,0.3)" />
          <Text style={s.title}>Live Camera Scan</Text>
          <Text style={s.body}>
            Camera access is only needed for live scanning. You can still scan codes from saved photos below.
          </Text>
          <Pressable style={s.btn} onPress={requestPermission}>
            <Text style={s.btnTxt}>Grant Permission</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={s.center}>
        <Ionicons name="camera-outline" size={72} color="#FF453A" />
        <Text style={s.title}>
          {permission.canAskAgain ? 'Camera Access Needed' : 'Camera Blocked'}
        </Text>
        <Text style={s.body}>
          {permission.canAskAgain
            ? 'Live scanning needs camera access. Scanning from photos works without it.'
            : 'Enable camera access in Settings for live scanning, or keep using photo scans without it.'}
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
    );
  };

  // ── Camera ready ───────────────────────────────────────────────────────────
  return (
    <View style={s.container}>
      <StatusBar hidden />

      {cameraVisible && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torchOn}
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: [
              'qr', 'ean13', 'ean8', 'upc_a', 'upc_e',
              'code128', 'code39', 'aztec', 'pdf417', 'datamatrix',
            ],
          }}
        />
      )}

      {/* Reticle — hidden once scanned so it vanishes when result sheet opens */}
      {cameraVisible && !scanned && <Reticle targetBounds={targetBounds} isLocking={isLocking} />}

      {renderCameraFallback()}

      {/* Top bar */}
      <View style={[s.topBar, { paddingTop: Platform.OS === 'ios' ? 56 : 36 }]}>
        {cameraVisible ? (
          <Pressable style={s.pill} onPress={() => setTorchOn(v => !v)}>
            <Ionicons
              name={torchOn ? 'flash' : 'flash-off'}
              size={22}
              color={torchOn ? '#FFD60A' : '#FFF'}
            />
          </Pressable>
        ) : (
          <View style={s.pillSpacer} />
        )}

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
        <Text style={s.hint}>
          {permission?.granted
            ? 'Point at any code to scan'
            : 'Scan a code from your photo library without enabling the camera'}
        </Text>

        <Pressable style={s.photosBtn} onPress={handleScanFromPhotos}>
          <Ionicons name="images-outline" size={17} color="rgba(255,255,255,0.8)" />
          <Text style={s.photosTxt}>Scan from Photos</Text>
        </Pressable>

        {permission?.granted && scanned && (
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
      {selectedImageUri && (
        <PhotoScanner
          visible={photoScannerVisible}
          imageUri={selectedImageUri}
          onClose={handlePhotoScannerClose}
          onResult={handlePhotoScannerResult}
        />
      )}
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
  pillSpacer: { width: 40, height: 40 },
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
