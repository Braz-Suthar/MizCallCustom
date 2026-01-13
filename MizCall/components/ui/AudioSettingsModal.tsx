import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';
import type { AudioDeviceInfo, AudioRoute } from '../../hooks/useAudioDeviceManager';

interface AudioSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  availableDevices: AudioDeviceInfo[];
  currentRoute: AudioRoute;
  onSelectDevice: (route: AudioRoute) => void;
  hardwareMuted?: boolean;
}

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({
  visible,
  onClose,
  availableDevices,
  currentRoute,
  onSelectDevice,
  hardwareMuted = false,
}) => {
  const { colors } = useTheme();
  const primaryColor = colors.primary ?? '#3c82f6';

  const getDeviceIcon = (type: AudioRoute): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'speaker':
        return 'volume-high';
      case 'earpiece':
        return 'call';
      case 'bluetooth':
        return 'bluetooth';
      case 'wired':
        return 'headset';
      default:
        return 'volume-high';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={[styles.backdrop, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <Pressable style={styles.backdropPress} onPress={onClose} />
          
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>Audio Settings</Text>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              {/* Hardware Mute Warning */}
              {hardwareMuted && (
                <View style={[styles.warningCard, { backgroundColor: '#ef444415', borderColor: '#ef4444' }]}>
                  <Ionicons name="alert-circle" size={20} color="#ef4444" />
                  <Text style={[styles.warningText, { color: '#ef4444' }]}>
                    Your microphone is muted by hardware. Please unmute it on your device.
                  </Text>
                </View>
              )}

              {/* Audio Devices Section */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Audio Output
                </Text>
                <Text style={[styles.sectionSubtitle, { color: colors.text, opacity: 0.6 }]}>
                  Select where you want to hear audio
                </Text>
              </View>

              {/* Device List */}
              <View style={styles.deviceList}>
                {availableDevices.map((device) => {
                  const isActive = device.type === currentRoute;
                  return (
                    <Pressable
                      key={device.type}
                      style={[
                        styles.deviceItem,
                        {
                          backgroundColor: isActive ? `${primaryColor}15` : colors.background,
                          borderColor: isActive ? primaryColor : colors.border,
                        },
                      ]}
                      onPress={() => onSelectDevice(device.type)}
                    >
                      <View style={styles.deviceInfo}>
                        <View
                          style={[
                            styles.deviceIconContainer,
                            {
                              backgroundColor: isActive ? primaryColor : `${primaryColor}30`,
                            },
                          ]}
                        >
                          <Ionicons
                            name={getDeviceIcon(device.type)}
                            size={24}
                            color={isActive ? '#fff' : primaryColor}
                          />
                        </View>
                        <View style={styles.deviceText}>
                          <Text
                            style={[
                              styles.deviceLabel,
                              {
                                color: colors.text,
                                fontWeight: isActive ? '600' : '400',
                              },
                            ]}
                          >
                            {device.label}
                          </Text>
                          {isActive && (
                            <Text style={[styles.activeText, { color: primaryColor }]}>
                              Active
                            </Text>
                          )}
                        </View>
                      </View>
                      {isActive && (
                        <Ionicons name="checkmark-circle" size={24} color={primaryColor} />
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {/* Info Card */}
              <View style={[styles.infoCard, { backgroundColor: `${primaryColor}10`, borderColor: `${primaryColor}30` }]}>
                <Ionicons name="information-circle" size={20} color={primaryColor} />
                <Text style={[styles.infoText, { color: primaryColor }]}>
                  <Text style={{ fontWeight: '600' }}>Auto-switching enabled: </Text>
                  Devices will automatically switch when you plug in or unplug headphones or connect Bluetooth during a call.
                </Text>
              </View>
            </ScrollView>

            {/* Footer Button */}
            <View style={[styles.footer, { borderTopColor: colors.border }]}>
              <Pressable
                style={[styles.closeButtonLarge, { backgroundColor: primaryColor }]}
                onPress={onClose}
              >
                <Text style={styles.closeButtonText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropPress: {
    flex: 1,
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    paddingHorizontal: 20,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 20,
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
  },
  deviceList: {
    gap: 12,
    marginBottom: 20,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  deviceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceText: {
    flex: 1,
  },
  deviceLabel: {
    fontSize: 16,
    marginBottom: 2,
  },
  activeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 20,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  closeButtonLarge: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
