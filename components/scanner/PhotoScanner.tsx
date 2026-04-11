import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { parseQRCode } from '../../services/qrParser';
import { checkUrlSafety } from '../../services/threatCheck';
import { useHistoryStore } from '../../store/useHistoryStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useScanAudio } from '../../hooks/useScanAudio';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { scanFromURLAsync } from 'expo-camera';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface PhotoScannerProps {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
  onResult: (data: any) => void;
}

export function PhotoScanner({ visible, imageUri, onClose, onResult }: PhotoScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [showLimitReached, setShowLimitReached] = useState(false);
  const { addItem } = useHistoryStore();
  const { saveToHistory, beepOnScan, vibrateOnScan, urlThreatScanning, autoCopyScanned } = useSettingsStore();
  const { playScanSound } = useScanAudio();

  const handleQRCodeFound = useCallback(async (qrData: string, isActive: () => boolean) => {
    if (!isActive()) {
      return;
    }

    setScanned(true);

    if (beepOnScan) {
      void playScanSound().catch((error) => {
        console.warn('[PhotoScanner] audio feedback failed:', error);
      });
    }

    if (!isActive()) {
      return;
    }

    if (vibrateOnScan) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch((error) => {
        console.warn('[PhotoScanner] haptic feedback failed:', error);
      });
    }

    if (!isActive()) {
      return;
    }

    let parsed: any;
    try {
      parsed = parseQRCode(qrData);
    } catch (e) {
      parsed = { type: 'text', data: { text: qrData }, rawValue: qrData };
    }

    // Safety Check Integration
    let safety: any = { checked: false, safe: null };
    if (parsed.type === 'url' && urlThreatScanning) {
      try {
        safety = await checkUrlSafety(parsed.data.url);
        safety = { checked: true, ...safety };
      } catch (error) {
        console.warn('Safety check failed:', error);
      }
    }

    // Save to history
    let success = true;
    let historyItemId: string | undefined;
    if (saveToHistory) {
      try {
        const saveResult = addItem({
          kind: 'scanned',
          type: parsed.type,
          rawValue: qrData,
          parsedData: parsed.data,
          safety,
        });
        success = saveResult.saved;
        historyItemId = saveResult.itemId;

        if (!success) {
          setShowLimitReached(true);
        }
      } catch (e) {
        console.warn('[PhotoScanner] history save failed:', e);
      }
    }

    if (!isActive()) {
      return;
    }

    try {
      onResult({ ...parsed, safety, historyItemId });
      
      // Auto-copy scanned content to clipboard if setting is enabled
      if (autoCopyScanned) {
        try {
          let contentToCopy = qrData;
          if (parsed.type === 'url') {
            contentToCopy = parsed.data.url;
          } else if (parsed.type === 'phone') {
            contentToCopy = parsed.data.phone;
          } else if (parsed.type === 'email') {
            contentToCopy = parsed.data.email;
          } else if (parsed.type === 'sms') {
            contentToCopy = parsed.data.phone;
          }
          await Clipboard.setStringAsync(contentToCopy);
        } catch (e) {
          console.warn('[PhotoScanner] auto-copy failed:', e);
        }
      }
      
      // Only close automatically if we AREN'T showing the limit dialog
      // Otherwise, we let the dialog's confirm action handle it
      if (success) {
        onClose();
      }
    } catch (e) {
      console.error('[PhotoScanner] onResult crashed:', e);
    }
  }, [addItem, beepOnScan, onClose, onResult, playScanSound, saveToHistory, vibrateOnScan, urlThreatScanning, autoCopyScanned]);

  useEffect(() => {
    if (!visible || !imageUri) {
      setIsScanning(false);
      setScanned(false);
      setScanError(null);
      return;
    }

    let active = true;

    const scanImageForQRCode = async () => {
      setIsScanning(true);
      setScanned(false);
      setScanError(null);

      try {
        const results = await scanFromURLAsync(imageUri, [
          'qr',
          'ean13',
          'ean8',
          'upc_a',
          'upc_e',
          'code128',
          'code39',
          'aztec',
          'pdf417',
          'datamatrix',
        ]);

        if (!active) {
          return;
        }

        const match = results.find(result => typeof result?.data === 'string' && result.data.length > 0);

        if (!match) {
          setScanError('No QR code or supported barcode was found in this photo.');
          return;
        }

        await handleQRCodeFound(match.raw || match.data, () => active);
      } catch (error) {
        if (!active) {
          return;
        }

        console.error('[PhotoScanner] Photo scan failed:', error);
        setScanError('This photo could not be scanned. Try a sharper image with the code fully visible.');
      } finally {
        if (active) {
          setIsScanning(false);
        }
      }
    };

    scanImageForQRCode();

    return () => {
      active = false;
    };
  }, [handleQRCodeFound, imageUri, visible]);

  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#FFF" />
          </Pressable>
          <Text style={styles.title}>Scan QR Code from Photo</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Image display with scan status overlays */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri }} style={styles.selectedImage} />

          {isScanning && (
            <View style={styles.scanningOverlay}>
              <ActivityIndicator size="large" color="#0A84FF" />
              <Text style={styles.scanningText}>Scanning selected photo...</Text>
            </View>
          )}

          {!isScanning && scanError && (
            <View style={styles.errorOverlay}>
              <Ionicons name="alert-circle-outline" size={48} color="#FF9F0A" />
              <Text style={styles.errorText}>{scanError}</Text>
            </View>
          )}

          {!isScanning && scanned && (
            <View style={styles.successOverlay}>
              <Ionicons name="checkmark-circle" size={48} color="#30D158" />
              <Text style={styles.successText}>Code Found!</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable style={styles.doneButton} onPress={onClose}>
            <Text style={styles.doneButtonText}>{scanError ? 'Back to Scanner' : 'Close'}</Text>
          </Pressable>
        </View>

        <ConfirmDialog
          visible={showLimitReached}
          title="Limit Reached"
          message="This scan has been saved 99 times already and won't be saved again."
          confirmLabel="OK"
          onConfirm={() => {
            setShowLimitReached(false);
            onClose();
          }}
          onCancel={() => {
            setShowLimitReached(false);
            onClose();
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    width: 40,
  },
  title: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  imageContainer: {
    flex: 1,
    margin: 20,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    resizeMode: 'contain',
  },
  scanningOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  scanningText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
  },
  errorOverlay: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 20,
    backgroundColor: 'rgba(0,0,0,0.82)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
  },
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  successText: {
    color: '#30D158',
    fontSize: 20,
    fontWeight: '600',
  },
  actions: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  doneButton: {
    backgroundColor: '#30D158',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
