import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform, AppState, AppStateStatus, NativeEventEmitter, NativeModules } from 'react-native';
import { mediaDevices, MediaStream } from 'react-native-webrtc';

// InCall Manager types
interface InCallManagerModule {
  start(options: { media?: string; auto?: boolean; ringback?: string }): void;
  stop(options?: { busytone?: string }): void;
  setForceSpeakerphoneOn(enable: boolean | null): void;
  setSpeakerphoneOn(enable: boolean): void;
  checkRecordPermission(): Promise<'granted' | 'denied' | 'unknow'>;
  requestRecordPermission(): Promise<'granted' | 'denied' | 'unknow'>;
}

let InCallManager: InCallManagerModule | null = null;
let InCallManagerEventEmitter: NativeEventEmitter | null = null;

if (Platform.OS === 'ios' || Platform.OS === 'android') {
  try {
    const InCallManagerModule = require('react-native-incall-manager');
    InCallManager = InCallManagerModule.default || InCallManagerModule;
    
    // Try to get the event emitter
    try {
      const { InCallManager: InCallManagerNative } = NativeModules;
      if (InCallManagerNative) {
        InCallManagerEventEmitter = new NativeEventEmitter(InCallManagerNative);
      }
    } catch {
      // Event emitter might not be available, that's okay
      console.log('[AudioDeviceManager] NativeEventEmitter not available for InCallManager');
    }
  } catch {
    console.warn('[AudioDeviceManager] InCallManager not available');
  }
}

export type AudioRoute = 'speaker' | 'earpiece' | 'bluetooth' | 'wired';

export interface AudioDeviceInfo {
  type: AudioRoute;
  label: string;
  active: boolean;
}

export interface UseAudioDeviceManagerProps {
  onDeviceChanged?: (route: AudioRoute) => void;
  defaultRoute?: AudioRoute;
}

export const useAudioDeviceManager = ({ onDeviceChanged, defaultRoute = 'speaker' }: UseAudioDeviceManagerProps = {}) => {
  const [currentRoute, setCurrentRoute] = useState<AudioRoute>(defaultRoute);
  const [availableDevices, setAvailableDevices] = useState<AudioDeviceInfo[]>([]);
  const [isBluetoothConnected, setIsBluetoothConnected] = useState(false);
  const [isWiredHeadsetConnected, setIsWiredHeadsetConnected] = useState(false);
  const [hardwareMuted, setHardwareMuted] = useState(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const streamRef = useRef<MediaStream | null>(null);

  // Enumerate available audio devices
  const enumerateDevices = useCallback(async () => {
    try {
      const devices: AudioDeviceInfo[] = [];

      // Always available: earpiece and speaker
      devices.push({
        type: 'earpiece',
        label: 'Earpiece',
        active: currentRoute === 'earpiece',
      });

      devices.push({
        type: 'speaker',
        label: 'Speaker',
        active: currentRoute === 'speaker',
      });

      // Check for Bluetooth and wired headsets
      // Note: React Native doesn't provide direct API to enumerate all audio devices like Web Audio API
      // We rely on InCallManager events and assumptions
      if (isBluetoothConnected) {
        devices.push({
          type: 'bluetooth',
          label: 'Bluetooth',
          active: currentRoute === 'bluetooth',
        });
      }

      if (isWiredHeadsetConnected) {
        devices.push({
          type: 'wired',
          label: 'Wired Headset',
          active: currentRoute === 'wired',
        });
      }

      setAvailableDevices(devices);
      console.log('[AudioDeviceManager] Available devices:', devices);
    } catch (error) {
      console.error('[AudioDeviceManager] Failed to enumerate devices:', error);
    }
  }, [currentRoute, isBluetoothConnected, isWiredHeadsetConnected]);

  // Switch audio route
  const switchAudioRoute = useCallback((route: AudioRoute) => {
    if (!InCallManager) {
      console.warn('[AudioDeviceManager] InCallManager not available');
      return;
    }

    try {
      console.log('[AudioDeviceManager] Switching audio route to:', route);

      switch (route) {
        case 'speaker':
          InCallManager.setForceSpeakerphoneOn(true);
          InCallManager.setSpeakerphoneOn(true);
          break;
        case 'earpiece':
          InCallManager.setForceSpeakerphoneOn(false);
          InCallManager.setSpeakerphoneOn(false);
          break;
        case 'bluetooth':
          // Bluetooth routing is automatic when connected
          // Just disable forced speaker mode
          InCallManager.setForceSpeakerphoneOn(null);
          break;
        case 'wired':
          // Wired headset routing is automatic when connected
          InCallManager.setForceSpeakerphoneOn(null);
          break;
      }

      setCurrentRoute(route);
      onDeviceChanged?.(route);
    } catch (error) {
      console.error('[AudioDeviceManager] Failed to switch audio route:', error);
    }
  }, [onDeviceChanged]);

  // Monitor hardware mute state from media track
  const monitorHardwareMute = useCallback((stream: MediaStream | null) => {
    if (!stream) return;

    streamRef.current = stream;
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;

    // Check initial state
    const isMuted = audioTrack.muted;
    setHardwareMuted(isMuted);
    console.log('[AudioDeviceManager] Initial mute state:', isMuted);

    // Listen for mute/unmute events
    audioTrack.onmute = () => {
      console.log('[AudioDeviceManager] Hardware mute detected');
      setHardwareMuted(true);
    };

    audioTrack.onunmute = () => {
      console.log('[AudioDeviceManager] Hardware unmute detected');
      setHardwareMuted(false);
    };
  }, []);

  // Auto-switch to wired headset or bluetooth when connected
  useEffect(() => {
    if (isWiredHeadsetConnected) {
      console.log('[AudioDeviceManager] Wired headset connected, auto-switching');
      switchAudioRoute('wired');
    } else if (isBluetoothConnected) {
      console.log('[AudioDeviceManager] Bluetooth connected, auto-switching');
      switchAudioRoute('bluetooth');
    } else {
      // No external device, switch to default (speaker)
      console.log('[AudioDeviceManager] No external device, switching to speaker');
      switchAudioRoute('speaker');
    }
  }, [isWiredHeadsetConnected, isBluetoothConnected, switchAudioRoute]);

  // Listen for InCallManager events (device plug/unplug)
  useEffect(() => {
    if (!InCallManager) {
      console.log('[AudioDeviceManager] InCallManager not available, skipping event listeners');
      return;
    }

    const onWiredHeadsetPlugged = () => {
      console.log('[AudioDeviceManager] Wired headset plugged in');
      setIsWiredHeadsetConnected(true);
    };

    const onWiredHeadsetUnplugged = () => {
      console.log('[AudioDeviceManager] Wired headset unplugged');
      setIsWiredHeadsetConnected(false);
    };

    const onBluetoothConnected = () => {
      console.log('[AudioDeviceManager] Bluetooth connected');
      setIsBluetoothConnected(true);
    };

    const onBluetoothDisconnected = () => {
      console.log('[AudioDeviceManager] Bluetooth disconnected');
      setIsBluetoothConnected(false);
    };

    // Register event listeners using NativeEventEmitter if available
    // Note: RNInCallManager only supports 'Proximity' and 'WiredHeadset' events
    const subscriptions: Array<{ remove: () => void }> = [];

    try {
      if (InCallManagerEventEmitter) {
        // Use NativeEventEmitter for event listening
        // Supported events: 'WiredHeadset' and 'Proximity'
        const wiredHeadsetSub = InCallManagerEventEmitter.addListener('WiredHeadset', (data: { isPlugged: boolean }) => {
          if (data.isPlugged) {
            onWiredHeadsetPlugged();
          } else {
            onWiredHeadsetUnplugged();
          }
        });
        subscriptions.push(wiredHeadsetSub);

        // Note: 'NearbyDeviceList' is NOT supported by RNInCallManager
        // Bluetooth detection is not available via InCallManager events
        // Users can still manually switch to Bluetooth via switchAudioRoute()
        console.log('[AudioDeviceManager] Bluetooth auto-detection not available via InCallManager events');

        if (Platform.OS === 'ios') {
          // iOS-specific audio route change
          const proximitySub = InCallManagerEventEmitter.addListener('Proximity', (data: { isNear: boolean }) => {
            console.log('[AudioDeviceManager] Proximity sensor:', data.isNear ? 'near' : 'far');
          });
          subscriptions.push(proximitySub);
        }

        console.log('[AudioDeviceManager] Event listeners registered via NativeEventEmitter');
      } else {
        console.warn('[AudioDeviceManager] NativeEventEmitter not available, device change detection will be limited');
        console.log('[AudioDeviceManager] Audio device switching will still work, but auto-detection of plug/unplug is disabled');
      }
    } catch (error) {
      console.error('[AudioDeviceManager] Failed to register event listeners:', error);
    }

    return () => {
      // Remove all event listeners
      subscriptions.forEach(sub => {
        try {
          sub.remove();
        } catch (error) {
          console.log('[AudioDeviceManager] Error removing event listener:', error);
        }
      });
    };
  }, []);

  // Update device list when connections change
  useEffect(() => {
    enumerateDevices();
  }, [enumerateDevices]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('[AudioDeviceManager] App came to foreground, re-enumerating devices');
        enumerateDevices();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [enumerateDevices]);

  return {
    currentRoute,
    availableDevices,
    switchAudioRoute,
    isBluetoothConnected,
    isWiredHeadsetConnected,
    hardwareMuted,
    monitorHardwareMute,
  };
};
