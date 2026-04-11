import React, { useState, useRef } from 'react';
import { View, StyleSheet, Text, Pressable, Alert, Linking, StatusBar } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { lightTheme, darkTheme, spacing, borderRadius, typography } from '../../constants/theme';
import { parseQRCode } from '../../services/qrParser';

interface ScannerScreenProps {
  onResult: (data: any) => void;
}

export function ScannerScreen({ onResult }: ScannerScreenProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(true);

  const cameraRef = useRef<CameraView>(null);

  React.useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  const handleBarcodeScanned = async (result: any) => {
    if (!isScanning) return;

    try {
      setIsScanning(false);

      // Use the parseQRCode function to properly detect QR code types
      const parsedData = parseQRCode(result.data);

      setTimeout(() => {
        onResult(parsedData);
      }, 350);

    } catch (error) {
      console.error('Scan processing error:', error);
      setIsScanning(true);
    }
  };

  const resetScan = () => {
    setIsScanning(true);
  };

  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color={theme.text.secondary} />
          <Text style={[styles.permissionTitle, { color: theme.text.primary }]}>
            Camera Permission Required
          </Text>
          <Text style={[styles.permissionText, { color: theme.text.secondary }]}>
            This app needs camera access to scan QR codes and barcodes. Please grant permission to continue.
          </Text>
          <Pressable
            style={[styles.permissionButton, { backgroundColor: theme.accent }]}
            onPress={requestPermission}
          >
            <Text style={[styles.permissionButtonText, { color: '#FFFFFF' }]}>
              Grant Permission
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color={theme.danger} />
          <Text style={[styles.permissionTitle, { color: theme.text.primary }]}>
            Camera Access Denied
          </Text>
          <Text style={[styles.permissionText, { color: theme.text.secondary }]}>
            Camera permission is required to scan codes. Please enable it in your device settings.
          </Text>
          <Pressable
            style={[styles.permissionButton, { backgroundColor: theme.accent }]}
            onPress={() => Linking.openSettings()}
          >
            <Text style={[styles.permissionButtonText, { color: '#FFFFFF' }]}>
              Open Settings
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        onBarcodeScanned={isScanning ? handleBarcodeScanned : undefined}
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'code93', 'itf14', 'codabar', 'aztec', 'pdf417', 'datamatrix'],
        }}
      />

      {/* Simple overlay */}
      <View style={[styles.topOverlay, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
        <Text style={[styles.title, { color: theme.text.primary }]}>
          QR Scanner
        </Text>
      </View>

      {/* Bottom overlay */}
      <View style={styles.bottomOverlay}>
        <Text style={[styles.instruction, { color: theme.text.secondary }]}>
          Point camera at any code
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  instruction: {
    fontFamily: typography.fontFamily,
    fontSize: 13,
    opacity: 0.6,
    marginBottom: 24,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  permissionTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  permissionText: {
    fontFamily: typography.fontFamily,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#0A84FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: '500',
  },
});
