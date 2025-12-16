import 'package:flutter/services.dart';

class BackgroundAudio {
  static const _channel = MethodChannel('mizcall/audio');

  static Future<void> start() async {
    await _channel.invokeMethod('startAudioService');
  }

  static Future<void> stop() async {
    await _channel.invokeMethod('stopAudioService');
  }
}
