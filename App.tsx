import React, { useRef, useState } from 'react';
import { View, StyleSheet, StatusBar, Linking, PanResponder, Animated, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';
import { BlurTargetView } from 'expo-blur';
import { ScannerScreen } from './components/scanner/CameraView';
import { ScanResultSheet } from './components/scanner/ScanResultSheet';
import { TabBar } from './components/ui/TabBar';
import { HistoryScreen } from './components/ui/HistoryScreen';
import { SettingsScreen } from './components/ui/SettingsScreen';
import { LiquidGlassBackground } from './components/ui/LiquidGlassBackground';
import { LiquidGlassProvider } from './components/ui/LiquidGlassContext';
import { QrGeneratorContent } from './components/generator/QrGeneratorContent';
import { QRCodeData, ScanSafetyState } from './constants/types';
import { checkUrlSafety, getThreatCheckSourceHint } from './services/threatCheck';
import { useHistoryStore } from './store/useHistoryStore';
import { useSettingsStore } from './store/useSettingsStore';
import { useAppTheme } from './hooks/useAppTheme';

const MIN_THREAT_CHECK_INDICATOR_MS = 600;
const MAX_THREAT_CHECK_WAIT_MS = 3500;
const THREAT_CHECK_TIMEOUT_MESSAGE = 'Could not finish the threat check in time.';
const TABS = ['scan', 'history', 'generate'];

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

export default function App() {
  const blurTargetRef = useRef<View | null>(null);
  const [activeTab, setActiveTab] = useState('scan');
  const [scanResult, setScanResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);
  const [scannerKey, setScannerKey] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [isTabBarHidden, setIsTabBarHidden] = useState(false);
  const threatCheckRunRef = useRef(0);
  const tabTransition = useRef(new Animated.Value(1)).current;
  const tabTransitionDirection = useRef(1);

  const updateItem = useHistoryStore((state) => state.updateItem);
  const { vibrateOnScan, autoOpenUrls, urlThreatScanning, swipeNavigation } = useSettingsStore();
  const { theme } = useAppTheme();

  const handleScanResult = async (data: QRCodeData & { safety?: ScanSafetyState; historyItemId?: string }) => {
    // Haptic feedback - use MEDIUM for successful scan
    if (vibrateOnScan) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Auto-open URLs with delay
    if (autoOpenUrls && data.type === 'url' && data.data.url) {
      setTimeout(() => {
        Linking.openURL(data.data.url);
      }, 500); // Small delay to let user see the result first
    }

    const requiresThreatCheck =
      data.type === 'url' &&
      urlThreatScanning &&
      (!data.safety || !data.safety.checked);

    if (!requiresThreatCheck) {
      setScanResult(data);
      setShowResult(true);
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

      const resolvedSafety: ScanSafetyState = {
        checked: true,
        safe: result.safety.safe,
        threatType: result.safety.threatType,
        confidence: result.safety.confidence,
        source: result.safety.source,
        checkedAt: Date.now(),
        inProgress: false,
      };

      setScanResult({ ...pendingResult, safety: resolvedSafety });

      if (data.historyItemId) {
        updateItem(data.historyItemId, { safety: resolvedSafety });
      }
    } catch (error) {
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

  const handleCloseResult = () => {
    threatCheckRunRef.current += 1;
    setShowResult(false);
    setScanResult(null);
    setScannerKey(k => k + 1);
  };

  const handleTabChange = (tab: string) => {
    if (tab === activeTab) {
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const currentIndex = TABS.indexOf(activeTab);
    const nextIndex = TABS.indexOf(tab);
    tabTransitionDirection.current = nextIndex > currentIndex ? 1 : -1;
    tabTransition.stopAnimation();
    tabTransition.setValue(0);
    setActiveTab(tab);
    Animated.timing(tabTransition, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    if (tab !== 'history') {
      setIsTabBarHidden(false);
    }
  };

  const currentTabIndex = TABS.indexOf(activeTab);

  const canHandleVerticalTabBarSwipe = activeTab !== 'history' && !showResult && !showSettings;
  const canHandleHorizontalTabSwipe = swipeNavigation && !showResult && !showSettings;

  const panResponder = (canHandleVerticalTabBarSwipe || canHandleHorizontalTabSwipe) ? PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gestureState) => {
      const { dx, dy } = gestureState;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      const isVerticalSwipe = canHandleVerticalTabBarSwipe && absDy > 10 && absDy > absDx;
      const isHorizontalSwipe = canHandleHorizontalTabSwipe && absDx > 10 && absDx > absDy;

      return isVerticalSwipe || isHorizontalSwipe;
    },
    onPanResponderRelease: (_, gestureState) => {
      const { dx, dy } = gestureState;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      const swipeThreshold = 50;

      if (canHandleVerticalTabBarSwipe && absDy > absDx) {
        if (dy > swipeThreshold) {
          setIsTabBarHidden(true);
          return;
        }

        if (dy < -swipeThreshold) {
          setIsTabBarHidden(false);
          return;
        }
      }

      if (canHandleHorizontalTabSwipe && absDx > absDy) {
        if (dx > swipeThreshold && currentTabIndex > 0) {
          handleTabChange(TABS[currentTabIndex - 1]);
        } else if (dx < -swipeThreshold && currentTabIndex < TABS.length - 1) {
          handleTabChange(TABS[currentTabIndex + 1]);
        }
      }
    },
  }) : null;

  console.log('[App Swipe] swipeNavigation setting:', swipeNavigation);
  console.log('[App Swipe] panHandlers exist:', panResponder !== null);
  const tabAnimatedStyle = {
    opacity: tabTransition.interpolate({
      inputRange: [0, 1],
      outputRange: [0.96, 1],
    }),
    transform: [
      {
        translateX: tabTransition.interpolate({
          inputRange: [0, 1],
          outputRange: [tabTransitionDirection.current * 42, 0],
        }),
      },
    ],
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]} {...(panResponder?.panHandlers || {})}>
      <StatusBar hidden />
      <BlurTargetView ref={blurTargetRef} style={StyleSheet.absoluteFill} pointerEvents="none">
        <LiquidGlassBackground />
      </BlurTargetView>

      <LiquidGlassProvider blurTargetRef={blurTargetRef}>
        {activeTab === 'scan' && !showResult && (
          <Animated.View style={[styles.tabContent, styles.animatedTabContent, tabAnimatedStyle]}>
            <ScannerScreen
              key={scannerKey}
              onResult={handleScanResult}
              onFineTuneActiveChange={() => {}}
              tabBarHidden={isTabBarHidden}
              onSettingsPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowSettings(true);
              }}
            />
          </Animated.View>
        )}
        
        {activeTab === 'generate' && (
          <Animated.View style={[styles.tabContent, styles.animatedTabContent, tabAnimatedStyle]}>
            <QrGeneratorContent />
          </Animated.View>
        )}
        
        {activeTab === 'history' && (
          <Animated.View style={[styles.tabContent, styles.animatedTabContent, tabAnimatedStyle]}>
            <HistoryScreen onTabBarVisibilityChange={setIsTabBarHidden} />
          </Animated.View>
        )}

        <TabBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          hidden={isTabBarHidden}
        />

        {showResult && scanResult && (
          <View style={[StyleSheet.absoluteFill, styles.resultOverlay, { backgroundColor: theme.backdrop }]}>
            <ScanResultSheet
              visible={showResult}
              onClose={handleCloseResult}
              data={scanResult}
            />
          </View>
        )}

        {showSettings && (
          <SettingsScreen 
            visible={showSettings} 
            onClose={() => setShowSettings(false)} 
          />
        )}
      </LiquidGlassProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
  },
  animatedTabContent: {
    overflow: 'hidden',
  },
  resultOverlay: {
    zIndex: 100,
    elevation: 100,
  },
});
