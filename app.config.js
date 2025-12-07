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
          icon: "./assets/icon.png",
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
      INCI_API_KEY: process.env.INCI_API_KEY,
      BACKEND_URL: process.env.BACKEND_URL,
      API_SECRET: process.env.API_SECRET,

      router: {},
      eas: {
        projectId: "0195c19e-c669-48d5-9aff-e11f302dd0b0"
      }
    }
  }
};
