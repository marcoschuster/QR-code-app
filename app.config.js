const TEST_ADMOB_ANDROID_APP_ID = "ca-app-pub-3940256099942544~3347511713";
const TEST_ADMOB_IOS_APP_ID = "ca-app-pub-3940256099942544~1458002511";

function getAdMobAppId(value, fallback) {
  if (!value || value.includes("XXXX") || value.includes("YYYY") || value.includes("ZZZZ")) {
    return fallback;
  }

  return value;
}

export default {
  expo: {
    name: "qr-scanner-app",
    slug: "qr-scanner-app", 
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    plugins: [
      [
        "expo-camera",
        {
          "cameraPermission": "Allow QR Scanner to access your camera to scan codes."
        }
      ],
      [
        "react-native-vision-camera",
        {
          "cameraPermissionText": "Allow QR Scanner to access your camera to scan codes.",
          "enableFrameProcessors": true,
          "enableCodeScanner": false,
          "enableMicrophonePermission": false,
          "enableLocation": false
        }
      ],
      [
        "react-native-google-mobile-ads",
        {
          androidAppId: getAdMobAppId(process.env.ADMOB_ANDROID_APP_ID, TEST_ADMOB_ANDROID_APP_ID),
          iosAppId: getAdMobAppId(process.env.ADMOB_IOS_APP_ID, TEST_ADMOB_IOS_APP_ID)
        }
      ],
      "expo-audio"
    ],
    ios: {
      supportsTablet: true,
      infoPlist: {
        NSUserTrackingUsageDescription: "This identifier will be used to deliver personalized ads to you."
      }
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundImage: "./assets/android-icon-background.png",
        monochromeImage: "./assets/android-icon-monochrome.png"
      },
      predictiveBackGestureEnabled: false,
      package: "com.marcoschuster.qrscannerapp"
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    // Development server configuration to prevent timeouts
    developmentClient: {
      https: false
    },
    // Metro bundler configuration
    metro: {
      transformer: {
        minifierConfig: {
          keep_fnames: true,
          mangle: {
            keep_fnames: true
          }
        }
      }
    },
    extra: {
      supportWorkerUrl: process.env.EXPO_PUBLIC_SUPPORT_WORKER_URL || 'https://your-worker.workers.dev',
      adMobBannerAdUnitId: process.env.EXPO_PUBLIC_ADMOB_BANNER_AD_UNIT_ID || '',
      adMobInterstitialAdUnitId: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_AD_UNIT_ID || '',
      adMobRewardedAdUnitId: process.env.EXPO_PUBLIC_ADMOB_REWARDED_AD_UNIT_ID || ''
    }
  }
};
