import 'dart:convert';
import 'package:flutter/material.dart';

import 'package:flutter_webrtc/flutter_webrtc.dart';

import '../core/auth.dart';
import '../core/background_audio.dart';
import '../core/config.dart';
import '../signaling/signaling_client.dart';
import '../webrtc/webrtc_service.dart';
import '../widgets/mic_button.dart';

class CallScreen extends StatefulWidget {
  const CallScreen({
    super.key,
    required this.jwtToken,
    this.wsUrl = defaultWsUrl,
  });

  final String jwtToken;
  final String wsUrl;

  @override
  State<CallScreen> createState() => _CallScreenState();
}

class _CallScreenState extends State<CallScreen> {
  late final WebRTCService _webrtc;
  late final SignalingClient _signaling;
  List<Map<String, dynamic>>? _iceServers;
  bool _webrtcReady = false;

  bool _connected = false;
  bool _speaking = false;

  @override
  void initState() {
    super.initState();
    _start();
  }

  Future<void> _start() async {
    try {
      // 1️⃣ Mic permission
      await requestMicPermission();

      _webrtc = WebRTCService();

      if (WebRTC.platformIsAndroid) {
        await Helper.setAndroidAudioConfiguration(
          AndroidAudioConfiguration.communication,
        );
      }

      await BackgroundAudio.start();
      // 3️⃣ Connect signaling
      _signaling = SignalingClient(widget.wsUrl);
      _signaling.stream.listen(_onSignal);

      // Optional eager init with whatever ice we have (likely empty)
      await _ensureWebrtcReady();

      // 4️⃣ Join room
      _signaling.send({
        "type": "JOIN",
        "token": widget.jwtToken,
      });

      setState(() => _connected = true);
    } catch (e) {
      debugPrint("Call init failed: $e");
    }
  }

  Future<void> _onSignal(dynamic raw) async {
    final msg = jsonDecode(raw);

    switch (msg["type"]) {
      case "TURN_CONFIG":
        _iceServers = List<Map<String, dynamic>>.from(msg["iceServers"]);
        await _ensureWebrtcReady();
        break;
      case "SEND_TRANSPORT_CREATED":
        await _ensureWebrtcReady();
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
        await _ensureWebrtcReady();
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
    if (_webrtcReady) {
      _webrtc.dispose();
    }
    super.dispose();
  }

  Future<void> _ensureWebrtcReady() async {
    if (_webrtcReady) return;
    await _webrtc.init(_iceServers ?? const []);
    _webrtcReady = true;
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
