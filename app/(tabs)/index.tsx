import React, { useState } from 'react';
import { View, StyleSheet, StatusBar, Modal, Text, Pressable, ScrollView, Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { ScannerScreen } from '../../components/scanner/CameraView';
import { TabBar } from '../../components/ui/TabBar';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';

export default function ScannerTab() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('scan');
  const [scanResult, setScanResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);
  const [scannerKey, setScannerKey] = useState(0);

  const handleScanResult = (data: any) => {
    console.log('[index] handleScanResult called, type:', data?.type);
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
          onResult={handleScanResult}
          onReset={handleReset}
          onSettingsPress={() => router.push('/settings')}
        />
      )}

      {/* NO presentationStyle prop — it breaks on Android */}
      <Modal
        visible={showResult && scanResult !== null}
        animationType="slide"
        onRequestClose={handleCloseResult}
        transparent={false}
      >
        {scanResult ? (
          <ResultSheet result={scanResult} onClose={handleCloseResult} />
        ) : null}
      </Modal>

      <TabBar activeTab={activeTab} onTabChange={handleTabChange} />
    </View>
  );
}

// ── Inline result sheet — no external imports that could crash ────────────────

function ResultSheet({ result, onClose }: { result: any; onClose: () => void }) {
  console.log('[ResultSheet] rendering, type:', result?.type, 'rawValue:', result?.rawValue);

  const typeLabels: Record<string, string> = {
    url: '🔗 URL', wifi: '📶 WiFi', email: '📧 Email',
    phone: '📱 Phone', text: '📄 Text', barcode: '🛒 Barcode',
    sms: '💬 SMS', vcard: '👤 Contact', location: '📍 Location',
  };

  const copy = async () => {
    await Clipboard.setStringAsync(result.rawValue);
    Alert.alert('Copied!', result.rawValue);
  };

  const openUrl = async () => {
    const url = result.data?.url;
    if (url) {
      console.log('[ResultSheet] opening URL:', url);
      await WebBrowser.openBrowserAsync(url);
    }
  };

  const renderContent = () => {
    switch (result.type) {
      case 'url':
        return (
          <View>
            <Text style={r.label}>Link</Text>
            <Text style={r.val} numberOfLines={4}>{result.data?.url}</Text>
          </View>
        );
      case 'wifi':
        return (
          <View style={{ gap: 8 }}>
            <Text style={r.label}>Network</Text>
            <Text style={r.val}>{result.data?.ssid}</Text>
            <Text style={r.label}>Security</Text>
            <Text style={r.val}>{result.data?.security}</Text>
            {result.data?.password ? (
              <>
                <Text style={r.label}>Password</Text>
                <Text style={r.val}>{'•'.repeat(Math.min(result.data.password.length, 16))}</Text>
              </>
            ) : null}
          </View>
        );
      case 'phone':
        return (
          <View>
            <Text style={r.label}>Number</Text>
            <Text style={r.val}>{result.data?.phone}</Text>
          </View>
        );
      case 'email':
        return (
          <View>
            <Text style={r.label}>Email</Text>
            <Text style={r.val}>{result.data?.email}</Text>
          </View>
        );
      default:
        return (
          <View>
            <Text style={r.label}>Content</Text>
            <Text style={r.val}>{result.data?.text || result.rawValue}</Text>
          </View>
        );
    }
  };

  return (
    <View style={r.sheet}>
      {/* Handle */}
      <View style={r.handle} />

      {/* Header */}
      <View style={r.header}>
        <Text style={r.typeTxt}>{typeLabels[result.type] ?? '📋 Scanned'}</Text>
        <Text style={r.sub}>Tap a button below to act on this result</Text>
      </View>

      <ScrollView style={r.body} contentContainerStyle={{ paddingBottom: 48 }}>
        {/* Content card */}
        <View style={r.card}>{renderContent()}</View>

        {/* Action buttons */}
        <View style={r.actions}>
          {result.type === 'url' && (
            <Pressable style={r.primary} onPress={openUrl}>
              <Ionicons name="globe-outline" size={20} color="#FFF" />
              <Text style={r.primaryTxt}>Open Link in Browser</Text>
            </Pressable>
          )}
          {result.type === 'phone' && (
            <Pressable style={r.primary} onPress={() => Linking.openURL(`tel:${result.data?.phone}`)}>
              <Ionicons name="call-outline" size={20} color="#FFF" />
              <Text style={r.primaryTxt}>Call {result.data?.phone}</Text>
            </Pressable>
          )}
          {result.type === 'email' && (
            <Pressable style={r.primary} onPress={() => Linking.openURL(`mailto:${result.data?.email}`)}>
              <Ionicons name="mail-outline" size={20} color="#FFF" />
              <Text style={r.primaryTxt}>Send Email</Text>
            </Pressable>
          )}
          {result.type === 'sms' && (
            <Pressable style={r.primary} onPress={() => Linking.openURL(`sms:${result.data?.phone}`)}>
              <Ionicons name="chatbubble-outline" size={20} color="#FFF" />
              <Text style={r.primaryTxt}>Send SMS</Text>
            </Pressable>
          )}

          <Pressable style={r.secondary} onPress={copy}>
            <Ionicons name="copy-outline" size={20} color="#000" />
            <Text style={r.secondaryTxt}>Copy to Clipboard</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Scan again */}
      <Pressable style={r.closeBtn} onPress={onClose}>
        <Text style={r.closeTxt}>Scan Again</Text>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
});

const r = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: '#F5F5F7' },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#D0D0D5', alignSelf: 'center', marginTop: 14, marginBottom: 6 },
  header: { backgroundColor: '#FFF', paddingHorizontal: 24, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#EBEBED' },
  typeTxt: { fontSize: 24, fontWeight: '700', color: '#000', letterSpacing: -0.5 },
  sub: { fontSize: 14, color: '#888', marginTop: 4 },
  body: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  label: { fontSize: 11, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  val: { fontSize: 17, color: '#000', lineHeight: 24 },
  actions: { gap: 10 },
  primary: { backgroundColor: '#0A84FF', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  primaryTxt: { fontSize: 16, fontWeight: '600', color: '#FFF' },
  secondary: { backgroundColor: '#E8E8ED', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  secondaryTxt: { fontSize: 16, fontWeight: '600', color: '#000' },
  closeBtn: { backgroundColor: '#FFF', paddingVertical: 20, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#EBEBED' },
  closeTxt: { fontSize: 17, fontWeight: '600', color: '#0A84FF' },
});
