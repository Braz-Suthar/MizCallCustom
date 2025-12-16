import 'dart:convert';
import 'package:flutter/material.dart';

import 'package:flutter_webrtc/flutter_webrtc.dart';

import '../core/auth.dart';
import '../signaling/signaling_client.dart';
import '../webrtc/webrtc_service.dart';
import '../widgets/mic_button.dart';
import '../core/background_audio.dart';

class CallScreen extends StatefulWidget {
  const CallScreen({super.key});

  @override
  State<CallScreen> createState() => _CallScreenState();
}

class _CallScreenState extends State<CallScreen> {
  late final WebRTCService _webrtc;
  late final SignalingClient _signaling;

  bool _connected = false;
  bool _speaking = false;

  // TODO: inject real JWT from login
  final String jwtToken = "REPLACE_WITH_REAL_JWT";

  // Android emulator → 10.0.2.2
  // Real device → your LAN IP
  final String wsUrl = "ws://10.0.2.2:3000/ws";

  @override
  void initState() {
    super.initState();
    _start();
  }

  Future<void> _start() async {
    try {
      // 1️⃣ Mic permission
      await requestMicPermission();

      // 2️⃣ Init WebRTC (audio-only)
      _webrtc = WebRTCService();
      await _webrtc.init();

      if (WebRTC.platformIsAndroid) {
        await Helper.setAndroidAudioConfiguration(
          AndroidAudioConfiguration.communication,
        );
      }

      await BackgroundAudio.start();
      // 3️⃣ Connect signaling
      _signaling = SignalingClient(wsUrl);
      _signaling.stream.listen(_onSignal);

      // 4️⃣ Join room
      _signaling.send({
        "type": "JOIN",
        "token": jwtToken,
      });

      setState(() => _connected = true);
    } catch (e) {
      debugPrint("Call init failed: $e");
    }
  }

  Future<void> _onSignal(dynamic raw) async {
    final msg = jsonDecode(raw);

    switch (msg["type"]) {
      case "SEND_TRANSPORT_CREATED":
        // CONNECT send transport (DTLS)
        _signaling.send({
          "type": "CONNECT_SEND_TRANSPORT",
          "dtlsParameters": await _webrtc.getDtlsParameters(),
        });

        // PRODUCE audio
        _signaling.send({
          "type": "PRODUCE",
          "kind": "audio",
          "rtpParameters": _webrtc.getRtpParameters(),
        });
        break;

      case "RECV_TRANSPORT_CREATED":
        // CONNECT recv transport (DTLS)
        _signaling.send({
          "type": "CONNECT_RECV_TRANSPORT",
          "dtlsParameters": await _webrtc.getDtlsParameters(),
        });
        break;

      case "NEW_PRODUCER":
        // Backend tells us a producer is available
        _signaling.send({
          "type": "CONSUME",
          "producerId": msg["producerId"],
        });
        break;

      case "CONSUMER_CREATED":
        // Audio will auto-play via pc.onTrack
        break;

      default:
        debugPrint("Unhandled signal: ${msg["type"]}");
    }
  }

  void _onMicPressed() {
    _webrtc.setMic(true);
    _signaling.send({ "type": "PTT_START" });
    setState(() => _speaking = true);
  }

  void _onMicReleased() {
    _webrtc.setMic(false);
    _signaling.send({ "type": "PTT_STOP" });
    setState(() => _speaking = false);
  }

  @override
  void dispose() {
    _signaling.close();
    _webrtc.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Live Call")),
      body: Column(
        children: [
          Expanded(
            child: Center(
              child: Text(
                !_connected
                    ? "Connecting..."
                    : _speaking
                        ? "Speaking"
                        : "Listening",
                style: const TextStyle(fontSize: 18),
              ),
            ),
          ),
          MicButton(
            onPressed: _onMicPressed,
            onReleased: _onMicReleased,
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}
