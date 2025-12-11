import "dotenv/config";

export default {
  expo: {
    name: "SKNCR",
    slug: "SKNCR",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "skncr",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,

    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.rakhymbekdev.skncr",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false
      }
    },

    android: {
      package: "com.rakhymbekdev.skncr",
      permissions: ["android.permission.CAMERA"],
      adaptiveIcon: {
        foregroundImage: "./assets/images/icon.png",
        backgroundColor: "#ffffff"
      }
    },

    web: {
      bundler: "metro",
      output: "server",
      favicon: "./assets/images/icon.png"
    },

    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff"
        }
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/images/icon.png",
          color: "#5C6BC0",
          sounds: ["./assets/notification-sound.wav"]
        }
      ],
      "expo-font"
    ],

    experiments: {
      typedRoutes: true
    },

    extra: {
      FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
      FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
      FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
      FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
      FIREBASE_APP_ID: process.env.FIREBASE_APP_ID,

      INCI_API_KEY: process.env.INCI_API_KEY,
      BACKEND_URL: process.env.BACKEND_URL,
      API_SECRET: process.env.API_SECRET,

      eas: {
        projectId: "0195c19e-c669-48d5-9aff-e11f302dd0b0"
      }
    }
  }
};
