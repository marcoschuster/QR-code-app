import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { RequestOptions, RewardedAdReward } from 'react-native-google-mobile-ads';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ADS_CONSENT_STATUS_KEY = 'ads_consent_status';
const INTERSTITIAL_COOLDOWN_MS = 3 * 60 * 1000;

export const ADMOB_TEST_IDS = {
  banner: 'ca-app-pub-3940256099942544/6300978111',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  rewarded: 'ca-app-pub-3940256099942544/5224354917',
};

type AdUnitKind = keyof typeof ADMOB_TEST_IDS;

interface AdsInitState {
  initialized: boolean;
  canRequestAds: boolean;
  requestNonPersonalizedAdsOnly: boolean;
  error?: string;
}

const DEFAULT_ADS_STATE: AdsInitState = {
  initialized: false,
  canRequestAds: false,
  requestNonPersonalizedAdsOnly: false,
};

let adsInitializationPromise: Promise<AdsInitState> | null = null;
let currentAdsState: AdsInitState = DEFAULT_ADS_STATE;
let lastInterstitialShownAt = 0;
let cachedGoogleMobileAdsModule: any | null | undefined;

export function getGoogleMobileAdsModule() {
  if (Platform.OS === 'web') {
    return null;
  }

  if (cachedGoogleMobileAdsModule !== undefined) {
    return cachedGoogleMobileAdsModule;
  }

  try {
    cachedGoogleMobileAdsModule = require('react-native-google-mobile-ads');
  } catch {
    cachedGoogleMobileAdsModule = null;
  }

  return cachedGoogleMobileAdsModule;
}

function getAdsUnavailableState(): AdsInitState {
  return {
    ...DEFAULT_ADS_STATE,
    error: 'AdMob native module is unavailable. Rebuild the development app after installing react-native-google-mobile-ads.',
  };
}

function getExpoExtra() {
  return Constants.expoConfig?.extra ?? {};
}

function getProductionAdUnitId(kind: AdUnitKind) {
  const extra = getExpoExtra();

  switch (kind) {
    case 'banner':
      return typeof extra.adMobBannerAdUnitId === 'string' ? extra.adMobBannerAdUnitId : '';
    case 'interstitial':
      return typeof extra.adMobInterstitialAdUnitId === 'string' ? extra.adMobInterstitialAdUnitId : '';
    case 'rewarded':
      return typeof extra.adMobRewardedAdUnitId === 'string' ? extra.adMobRewardedAdUnitId : '';
    default:
      return '';
  }
}

export function getAdUnitId(kind: AdUnitKind) {
  if (__DEV__) {
    return ADMOB_TEST_IDS[kind];
  }

  return getProductionAdUnitId(kind) || null;
}

async function getNonPersonalizedAdPreference() {
  const googleAds = getGoogleMobileAdsModule();

  if (!googleAds?.AdsConsent) {
    return false;
  }

  try {
    const gdprApplies = await googleAds.AdsConsent.getGdprApplies();

    if (!gdprApplies) {
      return false;
    }

    const choices = await googleAds.AdsConsent.getUserChoices();
    return choices.selectPersonalisedAds === false || choices.storeAndAccessInformationOnDevice === false;
  } catch {
    return false;
  }
}

async function persistConsentState(state: AdsInitState) {
  try {
    await AsyncStorage.setItem(ADS_CONSENT_STATUS_KEY, JSON.stringify({
      updatedAt: Date.now(),
      ...state,
    }));
  } catch {
    // Consent storage is informational only; UMP remains the source of truth.
  }
}

async function initializeMobileAds(requestNonPersonalizedAdsOnly: boolean) {
  const googleAds = getGoogleMobileAdsModule();
  const mobileAds = googleAds?.default;

  if (!mobileAds) {
    currentAdsState = getAdsUnavailableState();
    await persistConsentState(currentAdsState);
    return currentAdsState;
  }

  await mobileAds().setRequestConfiguration({
    maxAdContentRating: googleAds.MaxAdContentRating.PG,
    tagForChildDirectedTreatment: false,
    tagForUnderAgeOfConsent: false,
  });

  await mobileAds().initialize();

  currentAdsState = {
    initialized: true,
    canRequestAds: true,
    requestNonPersonalizedAdsOnly,
  };
  await persistConsentState(currentAdsState);
  return currentAdsState;
}

export async function initAds(): Promise<AdsInitState> {
  if (Platform.OS === 'web') {
    currentAdsState = { ...DEFAULT_ADS_STATE, error: 'AdMob is not available on web.' };
    return currentAdsState;
  }

  if (adsInitializationPromise) {
    return adsInitializationPromise;
  }

  adsInitializationPromise = (async () => {
    const googleAds = getGoogleMobileAdsModule();

    if (!googleAds?.AdsConsent) {
      currentAdsState = getAdsUnavailableState();
      await persistConsentState(currentAdsState);
      return currentAdsState;
    }

    try {
      const consentInfo = await googleAds.AdsConsent.gatherConsent(
        __DEV__
          ? { debugGeography: googleAds.AdsConsentDebugGeography.EEA }
          : undefined
      );
      const latestConsentInfo = consentInfo.canRequestAds
        ? consentInfo
        : await googleAds.AdsConsent.getConsentInfo();

      if (!latestConsentInfo.canRequestAds) {
        currentAdsState = {
          initialized: false,
          canRequestAds: false,
          requestNonPersonalizedAdsOnly: false,
        };
        await persistConsentState(currentAdsState);
        return currentAdsState;
      }

      return initializeMobileAds(await getNonPersonalizedAdPreference());
    } catch (error) {
      try {
        const fallbackConsentInfo = await googleAds.AdsConsent.getConsentInfo();

        if (!fallbackConsentInfo.canRequestAds) {
          currentAdsState = {
            initialized: false,
            canRequestAds: false,
            requestNonPersonalizedAdsOnly: false,
            error: error instanceof Error ? error.message : 'Ad consent failed.',
          };
          await persistConsentState(currentAdsState);
          return currentAdsState;
        }

        return initializeMobileAds(await getNonPersonalizedAdPreference());
      } catch (fallbackError) {
        currentAdsState = {
          initialized: false,
          canRequestAds: false,
          requestNonPersonalizedAdsOnly: false,
          error: fallbackError instanceof Error ? fallbackError.message : 'Ad initialization failed.',
        };
        await persistConsentState(currentAdsState);
        return currentAdsState;
      }
    }
  })();

  return adsInitializationPromise;
}

export function useAdsReady() {
  const [adsState, setAdsState] = useState(currentAdsState);

  useEffect(() => {
    let mounted = true;

    initAds()
      .then((state) => {
        if (mounted) {
          setAdsState(state);
        }
      })
      .catch((error) => {
        if (mounted) {
          setAdsState({
            ...DEFAULT_ADS_STATE,
            error: error instanceof Error ? error.message : 'Ad initialization failed.',
          });
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return adsState;
}

function getRequestOptions(adsState: AdsInitState): RequestOptions {
  return {
    requestNonPersonalizedAdsOnly: adsState.requestNonPersonalizedAdsOnly,
  };
}

export function useBanner() {
  const adsState = useAdsReady();
  const adUnitId = adsState.canRequestAds ? getAdUnitId('banner') : null;
  const requestOptions = useMemo(() => getRequestOptions(adsState), [adsState]);

  return {
    adUnitId,
    adsState,
    requestOptions,
    canShow: Boolean(adUnitId && adsState.canRequestAds),
  };
}

export function useInterstitial() {
  const adsState = useAdsReady();
  const adUnitId = adsState.canRequestAds ? getAdUnitId('interstitial') : null;
  const requestOptions = useMemo(() => getRequestOptions(adsState), [adsState]);
  const googleAds = getGoogleMobileAdsModule();
  const interstitial = googleAds?.useInterstitialAd?.(adUnitId, requestOptions) ?? {
    isLoaded: false,
    isClosed: false,
    load: () => {},
    show: () => {},
  };

  useEffect(() => {
    if (adUnitId) {
      try {
        interstitial.load();
      } catch {
        // Loading may fail in Expo Go or before a development build is installed.
      }
    }
  }, [adUnitId, interstitial.load]);

  useEffect(() => {
    if (interstitial.isClosed && adUnitId) {
      try {
        interstitial.load();
      } catch {
        // Ignore reload failures; callers can continue without ads.
      }
    }
  }, [adUnitId, interstitial.isClosed, interstitial.load]);

  const showInterstitial = useCallback(() => {
    const now = Date.now();

    if (!adsState.canRequestAds || !interstitial.isLoaded || now - lastInterstitialShownAt < INTERSTITIAL_COOLDOWN_MS) {
      return false;
    }

    try {
      interstitial.show();
      lastInterstitialShownAt = now;
      return true;
    } catch {
      return false;
    }
  }, [adsState.canRequestAds, interstitial]);

  return {
    ...interstitial,
    canShow: adsState.canRequestAds && interstitial.isLoaded,
    showInterstitial,
  };
}

export function useRewarded(onUserEarnedReward?: (reward: RewardedAdReward) => void) {
  const adsState = useAdsReady();
  const adUnitId = adsState.canRequestAds ? getAdUnitId('rewarded') : null;
  const requestOptions = useMemo(() => getRequestOptions(adsState), [adsState]);
  const googleAds = getGoogleMobileAdsModule();
  const rewarded = googleAds?.useRewardedAd?.(adUnitId, requestOptions) ?? {
    isLoaded: false,
    isEarnedReward: false,
    reward: undefined,
    load: () => {},
    show: () => {},
  };
  const lastRewardRef = useRef<RewardedAdReward | undefined>(undefined);

  useEffect(() => {
    if (rewarded.isEarnedReward && rewarded.reward && rewarded.reward !== lastRewardRef.current) {
      lastRewardRef.current = rewarded.reward;
      onUserEarnedReward?.(rewarded.reward);
    }
  }, [onUserEarnedReward, rewarded.isEarnedReward, rewarded.reward]);

  const loadRewarded = useCallback(() => {
    if (!adUnitId) {
      return false;
    }

    try {
      rewarded.load();
      return true;
    } catch {
      return false;
    }
  }, [adUnitId, rewarded]);

  const showRewarded = useCallback(() => {
    if (!adsState.canRequestAds || !rewarded.isLoaded) {
      return false;
    }

    try {
      rewarded.show();
      return true;
    } catch {
      return false;
    }
  }, [adsState.canRequestAds, rewarded]);

  return {
    ...rewarded,
    canShow: adsState.canRequestAds && rewarded.isLoaded,
    loadRewarded,
    showRewarded,
  };
}

export async function showAdPrivacyOptions() {
  const googleAds = getGoogleMobileAdsModule();

  if (!googleAds?.AdsConsent) {
    return getAdsUnavailableState();
  }

  try {
    const consentInfo = await googleAds.AdsConsent.showPrivacyOptionsForm();
    currentAdsState = {
      ...currentAdsState,
      canRequestAds: consentInfo.canRequestAds,
      requestNonPersonalizedAdsOnly: await getNonPersonalizedAdPreference(),
    };
    await persistConsentState(currentAdsState);
    return currentAdsState;
  } catch (error) {
    return {
      ...currentAdsState,
      error: error instanceof Error ? error.message : 'Ad privacy options are unavailable.',
    };
  }
}
