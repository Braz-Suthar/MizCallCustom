import { Platform } from "react-native";

let InCallManager: typeof import("react-native-incall-manager") | null = null;

// Only attempt to load on mobile platforms to avoid missing native modules on desktop/web.
if (Platform.OS === "ios" || Platform.OS === "android") {
  try {
    InCallManager = require("react-native-incall-manager");
  } catch {
    InCallManager = null;
  }
}

export const isMobilePlatform = Platform.OS === "ios" || Platform.OS === "android";

export const startCallAudio = () => {
  if (!isMobilePlatform || !InCallManager) return;
  try {
    // iOS fix: auto: false prevents automatic earpiece routing
    InCallManager.start({ 
      media: "audio", 
      auto: false,  // Critical for iOS - prevents earpiece routing
      ringback: "" 
    });
  } catch {
    // best effort
  }
};

export const enableSpeakerphone = () => {
  if (!isMobilePlatform || !InCallManager) return;
  try {
    // Must be called AFTER start() for iOS
    InCallManager.setForceSpeakerphoneOn(true);
    InCallManager.setSpeakerphoneOn(true);
    
    // iOS sometimes needs a slight delay
    if (Platform.OS === "ios") {
      setTimeout(() => {
        try {
          InCallManager.setSpeakerphoneOn(true);
        } catch {}
      }, 100);
    }
  } catch {
    // best effort
  }
};

export const disableSpeakerphone = () => {
  if (!isMobilePlatform || !InCallManager) return;
  try {
    InCallManager.setForceSpeakerphoneOn(false);
    InCallManager.setSpeakerphoneOn(false);
  } catch {
    // best effort
  }
};

export const stopCallAudio = () => {
  if (!isMobilePlatform || !InCallManager) return;
  try {
    InCallManager.stop();
  } catch {
    // best effort
  }
};

