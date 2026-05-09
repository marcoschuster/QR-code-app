import React, { useEffect, useRef } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getGoogleMobileAdsModule, useBanner } from '../lib/ads';

interface AdBannerProps {
  visible?: boolean;
  topOffset?: number;
}

export function AdBanner({ visible = true, topOffset = 0 }: AdBannerProps) {
  const bannerRef = useRef<any>(null);
  const insets = useSafeAreaInsets();
  const { adUnitId, canShow, requestOptions } = useBanner();
  const googleAds = getGoogleMobileAdsModule();
  const BannerAd = googleAds?.BannerAd;
  const bannerSize = googleAds?.BannerAdSize?.LARGE_ANCHORED_ADAPTIVE_BANNER;

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      return undefined;
    }

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        try {
          bannerRef.current?.load();
        } catch {
          // Banner reloads are best effort when returning from background.
        }
      }
    });

    return () => subscription.remove();
  }, []);

  if (!visible || !canShow || !adUnitId || !BannerAd || !bannerSize || Platform.OS === 'web') {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 8),
          top: topOffset,
        },
      ]}
    >
      <BannerAd
        ref={bannerRef}
        unitId={adUnitId}
        size={bannerSize}
        requestOptions={requestOptions}
        onAdFailedToLoad={(error: unknown) => {
          if (__DEV__) {
            console.warn('[AdBanner] Failed to load banner ad', error);
          }
        }}
        onAdLoaded={() => {
          if (__DEV__) {
            console.log('[AdBanner] Banner ad loaded');
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
    elevation: 20,
  },
});
