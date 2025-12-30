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
    InCallManager.start({ media: "audio" });
  } catch {
    // best effort
  }
};

export const enableSpeakerphone = () => {
  if (!isMobilePlatform || !InCallManager) return;
  try {
    InCallManager.setForceSpeakerphoneOn(true);
    InCallManager.setSpeakerphoneOn(true);
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

