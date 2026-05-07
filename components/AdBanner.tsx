import React, { useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BannerAd,
  BannerAdSize,
  useForeground,
} from 'react-native-google-mobile-ads';
import { useBanner } from '../lib/ads';

interface AdBannerProps {
  visible?: boolean;
  bottomOffset?: number;
}

export function AdBanner({ visible = true, bottomOffset = 0 }: AdBannerProps) {
  const bannerRef = useRef<BannerAd>(null);
  const insets = useSafeAreaInsets();
  const { adUnitId, canShow, requestOptions } = useBanner();

  useForeground(() => {
    if (Platform.OS === 'ios') {
      try {
        bannerRef.current?.load();
      } catch {
        // Banner reloads are best effort when returning from background.
      }
    }
  });

  if (!visible || !canShow || !adUnitId || Platform.OS === 'web') {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, 8),
          bottom: bottomOffset,
        },
      ]}
    >
      <BannerAd
        ref={bannerRef}
        unitId={adUnitId}
        size={BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER}
        requestOptions={requestOptions}
        onAdFailedToLoad={() => {
          // Ad fill is not guaranteed; keep UI quiet on failures.
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
