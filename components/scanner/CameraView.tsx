import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Linking,
  StatusBar,
  Platform,
  Animated,
  type LayoutChangeEvent,
} from 'react-native';
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
import { useAppTheme } from '../../hooks/useAppTheme';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface ScannerScreenProps {
  onResult: (data: any) => void;
  onSettingsPress?: () => void;
  onReset?: () => void;
}

let lastKnownCameraPermissionGranted = false;
const ZOOM_CONTROL_POINTS: number[] = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9];
const MAX_ZOOM = ZOOM_CONTROL_POINTS[ZOOM_CONTROL_POINTS.length - 1] ?? 0.6;

const clampValue = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const getAutoCopyLinkValue = (parsed: any) => {
  if (!parsed || typeof parsed.rawValue !== 'string' || !/^https?:\/\//i.test(parsed.rawValue)) {
    return null;
  }

  return parsed.data?.url || parsed.rawValue;
};

const getNearestPointIndex = (points: number[], value: number) =>
  points.reduce((bestIndex, point, index) => {
    const bestDistance = Math.abs((points[bestIndex] ?? 0) - value);
    const nextDistance = Math.abs(point - value);

    return nextDistance < bestDistance ? index : bestIndex;
  }, 0);

const getNextPointIndex = (points: number[], value: number, direction: -1 | 1) => {
  const nearestIndex = getNearestPointIndex(points, value);
  const nearestValue = points[nearestIndex] ?? 0;

  if (direction < 0) {
    if (value < nearestValue - 0.001) {
      return nearestIndex;
    }

    return Math.max(0, nearestIndex - 1);
  }

  if (value > nearestValue + 0.001) {
    return nearestIndex;
  }

  return Math.min(points.length - 1, nearestIndex + 1);
};

export function ScannerScreen({ onResult, onSettingsPress, onReset }: ScannerScreenProps) {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraFacing, setCameraFacing] = useState<'back' | 'front'>('back');
  const [scanned, setScanned] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [targetBounds, setTargetBounds] = useState<{origin: {x: number; y: number}; size: {width: number; height: number}} | null>(null);
  const [isLocking, setIsLocking] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showPhotoScanner, setShowPhotoScanner] = useState(false);
  const [showLimitReached, setShowLimitReached] = useState(false);
  const [zoom, setZoom] = useState(0);
  const photoScanSucceededRef = useRef(false);
  const { addItem } = useHistoryStore();
  const { saveToHistory, beepOnScan, vibrateOnScan, urlThreatScanning, autoCopyScanned } = useSettingsStore();
  const { playScanSound } = useScanAudio();

  useEffect(() => {
    if (permission?.granted) {
      lastKnownCameraPermissionGranted = true;
    }
  }, [permission?.granted]);

  useEffect(() => {
    return () => {
      // Cleanup when component unmounts
      setScanned(true);
      setTorchOn(false);
    };
  }, []);

  // ── Barcode scan handler ───────────────────────────────────────────────────
  const handleBarcodeScanned = async (result: { data: string; raw?: string; bounds?: {origin: {x: number; y: number}; size: {width: number; height: number}} }) => {
    if (scanned) return;
    const encodedValue = result.raw || result.data;

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
      parsed = parseQRCode(encodedValue);
    } catch (e) {
      parsed = { type: 'text', data: { text: encodedValue }, rawValue: encodedValue };
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
          rawValue: encodedValue,
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
      
      // Auto-copy only link-based scans when the setting is enabled.
      if (autoCopyScanned) {
        try {
          const contentToCopy = getAutoCopyLinkValue(parsed);

          if (contentToCopy) {
            await Clipboard.setStringAsync(contentToCopy);
          }
        } catch (e) {
          console.warn('[Scanner] auto-copy failed:', e);
        }
      }
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
        facing={cameraFacing}
        zoom={zoom}
        enableTorch={cameraFacing === 'back' && torchOn}
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

        <View style={s.topBarActions}>
          <Pressable style={s.pill} onPress={handleScanFromPhotos}>
            <Ionicons name="images-outline" size={22} color="#FFF" />
          </Pressable>
          <Pressable
            style={s.pill}
            onPress={() => {
              setTorchOn(false);
              setCameraFacing((current) => current === 'back' ? 'front' : 'back');
            }}
          >
            <Ionicons
              name={cameraFacing === 'front' ? 'camera-reverse' : 'camera-reverse-outline'}
              size={22}
              color="#FFF"
            />
          </Pressable>
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
      </View>

      {/* Bottom — button sits above the tab bar */}
      <View style={s.bottom}>
        <Text style={s.hint}>Point at any code to scan</Text>

        {!scanned && !showPhotoScanner ? (
          <ZoomControl
            points={ZOOM_CONTROL_POINTS}
            value={zoom}
            onValueChange={setZoom}
          />
        ) : null}

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

function ZoomControl({
  points,
  value,
  onValueChange,
}: {
  points: number[];
  value: number;
  onValueChange: (value: number) => void;
}) {
  const { theme } = useAppTheme();
  const animatedZoom = useRef(new Animated.Value(value)).current;
  const fineTuneAnim = useRef(new Animated.Value(0)).current;
  const zoomRef = useRef(value);
  const dragStartZoomRef = useRef(value);
  const fineTuneActiveRef = useRef(false);
  const longPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartXRef = useRef(0);
  const [trackWidth, setTrackWidth] = useState(214);
  const [fineTuneActive, setFineTuneActive] = useState(false);
  const minPoint = points[0] ?? 0;
  const maxPoint = points[points.length - 1] ?? MAX_ZOOM;
  const segmentWidth = trackWidth / Math.max(points.length, 1);
  const thumbTravelWidth = Math.max(1, trackWidth - segmentWidth);
  const pointCenters = points.map((_, index) => segmentWidth / 2 + index * segmentWidth);

  useEffect(() => {
    const previousValue = zoomRef.current;
    zoomRef.current = value;

    if (!fineTuneActive && Math.abs(value - previousValue) > 0.001) {
      animatedZoom.setValue(value);
    }
  }, [animatedZoom, fineTuneActive, value]);

  useEffect(() => {
    return () => {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
    };
  }, []);

  const setFineTuneVisible = (visible: boolean) => {
    fineTuneActiveRef.current = visible;
    setFineTuneActive(visible);
    Animated.spring(fineTuneAnim, {
      toValue: visible ? 1 : 0,
      useNativeDriver: false,
      friction: 7,
      tension: 90,
    }).start();
  };

  const updateZoomImmediate = (nextZoom: number) => {
    const clampedZoom = clampValue(nextZoom, minPoint, maxPoint);
    zoomRef.current = clampedZoom;
    animatedZoom.setValue(clampedZoom);
    onValueChange(clampedZoom);
  };

  const animateToZoom = (nextZoom: number) => {
    const clampedZoom = clampValue(nextZoom, minPoint, maxPoint);

    animatedZoom.stopAnimation();
    zoomRef.current = clampedZoom;
    Animated.spring(animatedZoom, {
      toValue: clampedZoom,
      useNativeDriver: false,
      friction: 8,
      tension: 110,
    }).start();
    onValueChange(clampedZoom);
  };

  const handleStepZoom = (direction: -1 | 1) => {
    const nextIndex = getNextPointIndex(points, zoomRef.current, direction);
    const nextValue = points[nextIndex] ?? minPoint;

    void Haptics.selectionAsync().catch(() => {});
    animateToZoom(nextValue);
  };

  const handleRailLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.max(1, event.nativeEvent.layout.width);
    setTrackWidth(nextWidth);
  };

  const handlePointPress = (point: number) => {
    void Haptics.selectionAsync().catch(() => {});
    animateToZoom(point);
  };

  const handleFineTuneStart = () => {
    dragStartZoomRef.current = zoomRef.current;
    setFineTuneVisible(true);
    void Haptics.selectionAsync().catch(() => {});
  };

  const stopFineTune = () => {
    setFineTuneVisible(false);
  };

  const clearLongPressTimeout = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  const thumbResponderHandlers = {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderGrant: (event: { nativeEvent: { pageX: number } }) => {
      touchStartXRef.current = event.nativeEvent.pageX;
      dragStartZoomRef.current = zoomRef.current;
      // Activate fine tune immediately on press
      handleFineTuneStart();
      clearLongPressTimeout();
    },
    onResponderMove: (event: { nativeEvent: { pageX: number } }) => {
      const dx = event.nativeEvent.pageX - touchStartXRef.current;

      if (!fineTuneActiveRef.current) {
        return;
      }

      const deltaZoom = (dx / thumbTravelWidth) * (maxPoint - minPoint);
      const nextZoom = clampValue(dragStartZoomRef.current + deltaZoom, minPoint, maxPoint);

      updateZoomImmediate(nextZoom);
    },
    onResponderRelease: () => {
      clearLongPressTimeout();
      if (fineTuneActiveRef.current) {
        stopFineTune();
      }
    },
    onResponderTerminate: () => {
      clearLongPressTimeout();
      if (fineTuneActiveRef.current) {
        stopFineTune();
      }
    },
  };

  const thumbTranslateX = animatedZoom.interpolate({
    inputRange: points,
    outputRange: pointCenters,
    extrapolate: 'clamp',
  });
  const fineTuneTrackOpacity = fineTuneAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const dotsOpacity = fineTuneAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.35],
  });
  const thumbScale = fineTuneAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15],
  });
  const activeZoomIndex = getNearestPointIndex(points, value);
  const canStepLeft = value > minPoint + 0.001;
  const canStepRight = value < maxPoint - 0.001;

  return (
    <View style={s.zoomControl}>
      <Pressable
        style={[s.zoomStepButton, !canStepLeft && s.zoomStepButtonDisabled]}
        onPress={() => handleStepZoom(-1)}
        disabled={!canStepLeft}
      >
        <Ionicons name="remove" size={18} color={canStepLeft ? '#FFF' : 'rgba(255,255,255,0.3)'} />
      </Pressable>

      <View style={s.zoomRailContainer}>
        <View style={s.zoomRailTapArea} onLayout={handleRailLayout}>
          {!fineTuneActive ? (
            <View style={s.zoomTapZones}>
              {points.map((point) => (
                <Pressable
                  key={`tap-${point}`}
                  style={s.zoomTapZone}
                  onPress={() => handlePointPress(point)}
                />
              ))}
            </View>
          ) : null}

          <Animated.View style={[s.zoomFineTuneTrack, { opacity: fineTuneTrackOpacity }]} />

          <Animated.View style={[s.zoomDotsRow, { opacity: dotsOpacity }]}>
            {points.map((point, index) => (
              <Pressable
                key={point}
                style={s.zoomDotPressable}
                onPress={() => handlePointPress(point)}
                disabled={fineTuneActive}
              >
                <View
                  style={[
                    s.zoomDot,
                    index === activeZoomIndex && s.zoomDotNearActive,
                  ]}
                />
              </Pressable>
            ))}
          </Animated.View>

          <Animated.View
            style={[
              s.zoomThumbWrap,
              {
                transform: [{ translateX: thumbTranslateX }, { scale: thumbScale }],
              },
            ]}
            {...thumbResponderHandlers}
          >
            <View style={s.zoomThumbTouch}>
              <View style={s.zoomThumbOuter}>
                <View style={[s.zoomThumbInner, { backgroundColor: theme.accent }]} />
              </View>
            </View>
          </Animated.View>
        </View>
      </View>

      <Pressable
        style={[s.zoomStepButton, !canStepRight && s.zoomStepButtonDisabled]}
        onPress={() => handleStepZoom(1)}
        disabled={!canStepRight}
      >
        <Ionicons name="add" size={18} color={canStepRight ? '#FFF' : 'rgba(255,255,255,0.3)'} />
      </Pressable>
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
  topBarActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  // bottom: sits high enough to clear the floating tab bar (height ~80) + its bottom offset (24)
  bottom:     { position: 'absolute', bottom: 160, left: 0, right: 0, alignItems: 'center', gap: 14 },
  zoomControl: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  zoomStepButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomStepButtonDisabled: {
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  zoomRailContainer: {
    width: 214,
    justifyContent: 'center',
  },
  zoomRailTapArea: {
    height: 38,
    justifyContent: 'center',
  },
  zoomTapZones: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  zoomTapZone: {
    flex: 1,
  },
  zoomFineTuneTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  zoomDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  zoomDotPressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  zoomDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  zoomDotNearActive: {
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  zoomThumbWrap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    marginLeft: -11,
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomThumbTouch: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomThumbOuter: {
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 4,
  },
  zoomThumbInner: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#0A84FF',
  },
  hint:       { fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
  rescanBtn:  { backgroundColor: '#0A84FF', paddingVertical: 12, paddingHorizontal: 28, borderRadius: 14 },
  rescanTxt:  { color: '#FFF', fontSize: 14, fontWeight: '600' },
});
