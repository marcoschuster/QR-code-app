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
      "expo-audio"
    ],
    ios: {
      supportsTablet: true
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
    }
  }
};
