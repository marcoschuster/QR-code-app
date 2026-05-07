import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import {
  Camera,
  useCameraDevice,
  useCameraFormat,
  useCameraPermission,
  type CameraRuntimeError,
  type CameraPermissionStatus,
  type CameraPosition,
} from 'react-native-vision-camera';
import {
  useBarcodeScanner,
  type Barcode,
  type BarcodeType,
  type Highlight,
  type Point,
} from '@mgcrea/vision-camera-barcode-scanner';
import { useRunOnJS } from 'react-native-worklets-core';
import { Ionicons } from '@expo/vector-icons';
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
  onFineTuneActiveChange?: (active: boolean) => void;
  tabBarHidden?: boolean;
  overlayAnimatedStyle?: any;
}

let lastKnownCameraPermissionGranted = false;
const ZOOM_CONTROL_POINTS: number[] = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9];
const MAX_ZOOM = ZOOM_CONTROL_POINTS[ZOOM_CONTROL_POINTS.length - 1] ?? 0.6;
const CAMERA_PREVIEW_FPS = 30;
const DEFAULT_BARCODE_SCAN_FPS = 10;
const MIN_BARCODE_SCAN_FPS = 5;
const MAX_BARCODE_SCAN_FPS = 30;
const BARCODE_TYPES: BarcodeType[] = [
  'qr',
  'ean-13',
  'ean-8',
  'upc-a',
  'upc-e',
  'code-128',
  'code-39',
  'aztec',
  'pdf-417',
  'data-matrix',
];

const clampValue = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const getVisionCameraZoom = (
  device: ReturnType<typeof useCameraDevice>,
  normalizedZoom: number
) => {
  if (!device) {
    return 1;
  }

  const minZoom = Math.max(device.minZoom, device.neutralZoom);
  const maxZoom = Math.max(minZoom, Math.min(device.maxZoom, device.neutralZoom * 8));
  const progress = clampValue(normalizedZoom / MAX_ZOOM, 0, 1);

  return minZoom * Math.pow(maxZoom / minZoom, progress);
};

type NativeScanResult = {
  value: string;
  format: BarcodeType | string;
  cornerPoints: Point[];
};

type CameraRuntimeIssue = {
  code: string;
  message: string;
};

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

export function ScannerScreen({
  onResult,
  onSettingsPress,
  onReset,
  onFineTuneActiveChange,
  tabBarHidden = false,
  overlayAnimatedStyle,
}: ScannerScreenProps) {
  const { hasPermission, requestPermission: requestVisionCameraPermission } = useCameraPermission();
  const [permissionStatus, setPermissionStatus] = useState<CameraPermissionStatus>(() =>
    Camera.getCameraPermissionStatus()
  );
  const [cameraFacing, setCameraFacing] = useState<CameraPosition>('back');
  const [scanned, setScanned] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [targetBounds, setTargetBounds] = useState<{origin: {x: number; y: number}; size: {width: number; height: number}} | null>(null);
  const [isLocking, setIsLocking] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showPhotoScanner, setShowPhotoScanner] = useState(false);
  const [showLimitReached, setShowLimitReached] = useState(false);
  const [zoom, setZoom] = useState(0);
  const [cameraRuntimeIssue, setCameraRuntimeIssue] = useState<CameraRuntimeIssue | null>(null);
  const photoScanSucceededRef = useRef(false);
  const scannedRef = useRef(false);
  const bottomOffset = useRef(new Animated.Value(tabBarHidden ? 84 : 160)).current;
  const { theme } = useAppTheme();
  const { addScan } = useHistoryStore();
  const { saveToHistory, beepOnScan, vibrateOnScan, urlThreatScanning, autoCopyScanned } = useSettingsStore();
  const { playScanSound } = useScanAudio();
  const scanRuntimeRef = useRef({
    addScan,
    autoCopyScanned,
    beepOnScan,
    onResult,
    playScanSound,
    saveToHistory,
    urlThreatScanning,
    vibrateOnScan,
  });
  const device = useCameraDevice(cameraFacing);
  const format = useCameraFormat(device, [
    { fps: CAMERA_PREVIEW_FPS },
    { videoResolution: { width: 1920, height: 1080 } },
  ]);
  const cameraZoom = useMemo(() => getVisionCameraZoom(device, zoom), [device, zoom]);
  const barcodeScanFps = clampValue(DEFAULT_BARCODE_SCAN_FPS, MIN_BARCODE_SCAN_FPS, MAX_BARCODE_SCAN_FPS);

  useEffect(() => {
    setPermissionStatus(Camera.getCameraPermissionStatus());
  }, [hasPermission]);

  useEffect(() => {
    setCameraRuntimeIssue(null);
  }, [cameraFacing, hasPermission]);

  useEffect(() => {
    if (hasPermission) {
      lastKnownCameraPermissionGranted = true;
    }
  }, [hasPermission]);

  useEffect(() => {
    scannedRef.current = scanned;
  }, [scanned]);

  useEffect(() => {
    scanRuntimeRef.current = {
      addScan,
      autoCopyScanned,
      beepOnScan,
      onResult,
      playScanSound,
      saveToHistory,
      urlThreatScanning,
      vibrateOnScan,
    };
  }, [
    addScan,
    autoCopyScanned,
    beepOnScan,
    onResult,
    playScanSound,
    saveToHistory,
    urlThreatScanning,
    vibrateOnScan,
  ]);

  useEffect(() => {
    return () => {
      // Cleanup when component unmounts
      setScanned(true);
      setTorchOn(false);
    };
  }, []);

  useEffect(() => {
    Animated.timing(bottomOffset, {
      toValue: tabBarHidden ? 84 : 160,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [bottomOffset, tabBarHidden]);

  const requestPermission = useCallback(async () => {
    const granted = await requestVisionCameraPermission();
    setPermissionStatus(Camera.getCameraPermissionStatus());

    if (granted) {
      lastKnownCameraPermissionGranted = true;
    }
  }, [requestVisionCameraPermission]);

  const handleCameraError = useCallback((error: CameraRuntimeError) => {
    console.warn('[Scanner] camera runtime error:', error);
    setCameraRuntimeIssue({
      code: error.code,
      message: error.message,
    });
  }, []);

  // ── Barcode scan handler ───────────────────────────────────────────────────
  const handleBarcodeScanned = useCallback(async (result: NativeScanResult) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    const encodedValue = result.value;
    const {
      addScan,
      autoCopyScanned,
      beepOnScan,
      onResult,
      playScanSound,
      saveToHistory,
      urlThreatScanning,
      vibrateOnScan,
    } = scanRuntimeRef.current;

    // 1. Start the lock animation FIRST
    setTargetBounds(null);
    setIsLocking(true);

    // 2. Wait for animation to complete before showing result
    await new Promise(resolve => setTimeout(resolve, 450));

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
        const saveResult = addScan({
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
  }, []);

  const handleBarcodeScannedOnJS = useRunOnJS(handleBarcodeScanned, [handleBarcodeScanned]);
  const { props: barcodeScannerProps, highlights: scannerHighlights } = useBarcodeScanner({
    fps: barcodeScanFps,
    barcodeTypes: BARCODE_TYPES,
    resizeMode: 'cover',
    disableHighlighting: scanned || showPhotoScanner,
    onBarcodeScanned: (barcodes: Barcode[]) => {
      'worklet';

      const results: NativeScanResult[] = [];

      for (const barcode of barcodes) {
        if (!barcode.value) {
          continue;
        }

        results.push({
          value: barcode.value,
          format: barcode.type,
          cornerPoints: barcode.cornerPoints,
        });
      }

      if (results.length > 0) {
        handleBarcodeScannedOnJS(results[0]);
      }

      return results;
    },
  });

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
      scannedRef.current = true;
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
  if (permissionStatus === 'not-determined' && !hasPermission && !lastKnownCameraPermissionGranted) {
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
  if (permissionStatus === 'restricted' || cameraRuntimeIssue?.code === 'system/camera-is-restricted') {
    return (
      <View style={s.container}>
        <StatusBar hidden />
        <View style={s.center}>
          <Ionicons name="camera-outline" size={72} color="#FF9F0A" />
          <Text style={s.title}>Camera Restricted</Text>
          <Text style={s.body}>
            Camera access is restricted by this device or operating system policy. Try another device, emulator image, or disable the camera restriction in device policy settings.
          </Text>
        </View>
      </View>
    );
  }

  if (cameraRuntimeIssue) {
    return (
      <View style={s.container}>
        <StatusBar hidden />
        <View style={s.center}>
          <Ionicons name="camera-outline" size={72} color="#FF453A" />
          <Text style={s.title}>Camera Error</Text>
          <Text style={s.body}>{cameraRuntimeIssue.message}</Text>
        </View>
      </View>
    );
  }

  if (!hasPermission && permissionStatus !== 'not-determined') {
    return (
      <View style={s.container}>
        <StatusBar hidden />
        <View style={s.center}>
          <Ionicons name="camera-outline" size={72} color="#FF453A" />
          <Text style={s.title}>Camera Blocked</Text>
          <Text style={s.body}>Go to Settings and enable camera access for this app.</Text>
          <Pressable
            style={s.btn}
            onPress={() => Linking.openSettings()}
          >
            <Text style={s.btnTxt}>Open Settings</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={s.container}>
        <StatusBar hidden />
        <View style={s.center}>
          <Ionicons name="camera-outline" size={72} color="rgba(255,255,255,0.3)" />
          <Text style={s.title}>Camera Unavailable</Text>
          <Text style={s.body}>No {cameraFacing} camera was found on this device.</Text>
        </View>
      </View>
    );
  }

  // ── Camera ready ───────────────────────────────────────────────────────────
  return (
    <View style={s.container}>
      <StatusBar hidden />

      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={!scanned && !showPhotoScanner}
        format={format}
        fps={CAMERA_PREVIEW_FPS}
        pixelFormat="yuv"
        resizeMode="cover"
        zoom={cameraZoom}
        torch={device.hasTorch && cameraFacing === 'back' && torchOn ? 'on' : 'off'}
        onError={handleCameraError}
        {...barcodeScannerProps}
      />

      {/* Reticle — hidden once scanned so it vanishes when result sheet opens */}
      {!scanned && !showPhotoScanner && (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, overlayAnimatedStyle]}
        >
          <Reticle
            targetBounds={targetBounds}
            highlights={scannerHighlights as Highlight[]}
            isLocking={isLocking}
          />
        </Animated.View>
      )}

      {/* Top bar */}
      <Animated.View style={[s.topBar, { paddingTop: Platform.OS === 'ios' ? 56 : 36 }, overlayAnimatedStyle]}>
        <View style={s.topBarLeft}>
          <Pressable
            style={[s.pill, { backgroundColor: 'rgba(0,0,0,0.45)', borderColor: theme.border }]}
            onPress={() => setTorchOn(v => !v)}
            disabled={!device.hasTorch || cameraFacing !== 'back'}
          >
            <Ionicons
              name={torchOn ? 'flash' : 'flash-off'}
              size={22}
              color={!device.hasTorch || cameraFacing !== 'back' ? 'rgba(255,255,255,0.35)' : torchOn ? '#FFD60A' : '#FFF'}
            />
          </Pressable>
          <Pressable
            style={[s.pill, { backgroundColor: 'rgba(0,0,0,0.45)', borderColor: theme.border }]}
            onPress={() => {
              setTorchOn(false);
              setCameraFacing((current) => current === 'back' ? 'front' : 'back');
            }}
          >
            <Ionicons name="camera-reverse-outline" size={22} color="#FFF" />
          </Pressable>
        </View>

        <View style={s.topBarActions}>
          <Pressable
            style={[s.pill, { backgroundColor: 'rgba(0,0,0,0.45)', borderColor: theme.border }]}
            onPress={handleScanFromPhotos}
          >
            <Ionicons name="images-outline" size={22} color="#FFF" />
          </Pressable>
          <Pressable
            style={[s.pill, { backgroundColor: 'rgba(0,0,0,0.45)', borderColor: theme.border }]}
            onPress={() => {
              setTorchOn(false);
              onSettingsPress?.();
            }}
          >
            <Ionicons name="settings-outline" size={22} color="#FFF" />
          </Pressable>
        </View>
      </Animated.View>

      {/* Bottom — button sits above the tab bar */}
      <Animated.View style={[s.bottom, { bottom: bottomOffset }]}>
        <Animated.View style={overlayAnimatedStyle}>
          {!scanned && !showPhotoScanner ? (
            <View
              style={[
                s.zoomShell,
                {
                  backgroundColor: 'transparent',
                  borderColor: theme.border,
                  shadowColor: theme.shadow,
                },
              ]}
            >
              <ZoomControl
                points={ZOOM_CONTROL_POINTS}
                value={zoom}
                onValueChange={setZoom}
                onFineTuneActiveChange={onFineTuneActiveChange}
              />
            </View>
          ) : null}

          {scanned && (
            <Pressable
              style={[s.rescanBtn, { backgroundColor: 'rgba(0,0,0,0.45)', borderColor: theme.border }]}
              onPress={() => {
                setScanned(false);
                scannedRef.current = false;
                setTargetBounds(null);
                setIsLocking(false);
                onReset?.();
              }}
            >
              <Text style={s.rescanTxt}>Tap to Scan Again</Text>
            </Pressable>
          )}
        </Animated.View>
      </Animated.View>

      {/* Photo Scanner Modal */}
      <PhotoScanner
        visible={showPhotoScanner}
        imageUri={selectedImage || ''}
        onClose={() => {
          setShowPhotoScanner(false);
          setSelectedImage(null);
          if (!photoScanSucceededRef.current) {
            scannedRef.current = false;
            setScanned(false);
            setTargetBounds(null);
            setIsLocking(false);
          }
        }}
        onResult={(data) => {
          photoScanSucceededRef.current = true;
          scannedRef.current = true;
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
  onFineTuneActiveChange,
}: {
  points: number[];
  value: number;
  onValueChange: (value: number) => void;
  onFineTuneActiveChange?: (active: boolean) => void;
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
  const thumbTravelWidth = Math.max(1, trackWidth);
  const pointCenters = points.map((_, index) => {
    if (points.length <= 1) {
      return 0;
    }

    return (index / (points.length - 1)) * thumbTravelWidth;
  });

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
    onFineTuneActiveChange?.(visible);
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
    Animated.timing(animatedZoom, {
      toValue: clampedZoom,
      useNativeDriver: false,
      duration: 140,
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
    onStartShouldSetResponderCapture: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderTerminationRequest: () => !fineTuneActiveRef.current,
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

  const railResponderHandlers = {
    onStartShouldSetResponder: () => false,
    onMoveShouldSetResponder: () => false,
    onMoveShouldSetResponderCapture: () => false,
    onResponderGrant: (event: { nativeEvent: { pageX: number } }) => {
      if (fineTuneActiveRef.current) {
        touchStartXRef.current = event.nativeEvent.pageX;
        dragStartZoomRef.current = zoomRef.current;
      }
    },
    onResponderMove: (event: { nativeEvent: { pageX: number } }) => {
      if (!fineTuneActiveRef.current) {
        return;
      }

      const dx = event.nativeEvent.pageX - touchStartXRef.current;
      const deltaZoom = (dx / thumbTravelWidth) * (maxPoint - minPoint);
      const nextZoom = clampValue(dragStartZoomRef.current + deltaZoom, minPoint, maxPoint);

      updateZoomImmediate(nextZoom);
    },
    onResponderRelease: () => {
      if (fineTuneActiveRef.current) {
        stopFineTune();
      }
    },
    onResponderTerminate: () => {
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
        <View style={s.zoomRailTapArea} onLayout={handleRailLayout} {...railResponderHandlers}>
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
  pill:       { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  topBarActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  // Moves down when the floating tab bar is hidden so the control can use that space.
  bottom:     { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 14 },
  zoomShell: {
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0,
    shadowRadius: 24,
    elevation: 0,
  },
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
  zoomDotsRow: {
    position: 'absolute',
    left: -14,
    right: -14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  zoomDotPressable: {
    width: 28,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomDot: {
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  zoomDotNearActive: {
    width: 7,
    height: 7,
    backgroundColor: '#FFFFFF',
  },
  zoomThumbWrap: {
    position: 'absolute',
    left: -25,
  },
  zoomThumbTouch: {
    width: 50,
    height: 50,
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
  rescanBtn:  { paddingVertical: 12, paddingHorizontal: 28, borderRadius: 18, borderWidth: 1 },
  rescanTxt:  { color: '#FFF', fontSize: 14, fontWeight: '600' },
});
