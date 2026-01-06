// import { Platform } from "react-native";

// let InCallManager: typeof import("react-native-incall-manager") | null = null;

// // Only attempt to load on mobile platforms to avoid missing native modules on desktop/web.
// if (Platform.OS === "ios" || Platform.OS === "android") {
//   try {
//     InCallManager = require("react-native-incall-manager");
//   } catch {
//     InCallManager = null;
//   }
// }

// export const isMobilePlatform = Platform.OS === "ios" || Platform.OS === "android";

// export const startCallAudio = () => {
//   if (!isMobilePlatform || !InCallManager) return;
//   try {
//     // iOS fix: auto: false prevents automatic earpiece routing
//     InCallManager.start({ 
//       media: "audio", 
//       auto: false,  // Critical for iOS - prevents earpiece routing
//       ringback: "" 
//     });
//   } catch {
//     // best effort
//   }
// };

// export const enableSpeakerphone = () => {
//   if (!isMobilePlatform || !InCallManager) return;
//   try {
//     // Must be called AFTER start() for iOS
//     InCallManager.setForceSpeakerphoneOn(true);
//     InCallManager.setSpeakerphoneOn(true);
    
//     // iOS sometimes needs a slight delay
//     if (Platform.OS === "ios") {
//       setTimeout(() => {
//         try {
//           InCallManager.setSpeakerphoneOn(true);
//         } catch {}
//       }, 100);
//     }
//   } catch {
//     // best effort
//   }
// };

// export const disableSpeakerphone = () => {
//   if (!isMobilePlatform || !InCallManager) return;
//   try {
//     InCallManager.setForceSpeakerphoneOn(false);
//     InCallManager.setSpeakerphoneOn(false);
//   } catch {
//     // best effort
//   }
// };

// export const stopCallAudio = () => {
//   if (!isMobilePlatform || !InCallManager) return;
//   try {
//     InCallManager.stop();
//   } catch {

import { Platform } from "react-native";

let InCallManager: typeof import("react-native-incall-manager").default | null = null;

if (Platform.OS === "ios" || Platform.OS === "android") {
  try {
    InCallManager = require("react-native-incall-manager").default;
  } catch {
    InCallManager = null;
  }
}

export const isMobilePlatform = Platform.OS === "ios" || Platform.OS === "android";

export const startCallAudio = (isVideoCall: boolean = false) => {
  if (!isMobilePlatform || !InCallManager) return;

  try {
    // Key change: Use 'video' media type for loudspeaker by default on iOS
    // (works even for audio-only calls – it's a common reliable workaround)
    const media = isVideoCall ? "video" : "video"; // or keep "audio" if you prefer forcing manually

    // auto: false prevents iOS from automatically switching to earpiece based on proximity
    InCallManager.start({ 
      media,
      auto: false,
      ringback: "" 
    });

    // If using media: 'audio', force speaker immediately after start
    if (!isVideoCall) {
      InCallManager.setForceSpeakerphoneOn(true);
    }
  } catch (e) {
    console.warn("InCallManager start failed", e);
  }
};

export const enableSpeakerphone = () => {
  if (!isMobilePlatform || !InCallManager) return;

  try {
    // Primary method for iOS
    InCallManager.setForceSpeakerphoneOn(true);

    // setSpeakerphoneOn is ignored on iOS but harmless on Android
    InCallManager.setSpeakerphoneOn(true);

    // Extra reliability: small delay + re-apply (common workaround for iOS timing quirks)
    if (Platform.OS === "ios") {
      setTimeout(() => {
        try {
          InCallManager.setForceSpeakerphoneOn(true);
        } catch {}
      }, 300); // Increased to 300ms – some devices need more time
    }
  } catch (e) {
    console.warn("enableSpeakerphone failed", e);
  }
};

export const disableSpeakerphone = () => {
  if (!isMobilePlatform || !InCallManager) return;

  try {
    // Use null to revert to default iOS behavior (earpiece for audio)
    InCallManager.setForceSpeakerphoneOn(null); // or false if you want to force off
    InCallManager.setSpeakerphoneOn(false);
  } catch (e) {
    console.warn("disableSpeakerphone failed", e);
  }
};

export const stopCallAudio = () => {
  if (!isMobilePlatform || !InCallManager) return;

  try {
    InCallManager.stop({ busytone: "" });
  } catch (e) {
    console.warn("InCallManager stop failed", e);
  }
};