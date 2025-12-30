import 'package:flutter_webrtc/flutter_webrtc.dart';

class WebRTCService {
  late RTCPeerConnection pc;
  late MediaStream localStream;
  late MediaStreamTrack audioTrack;
  late RTCVideoRenderer _remoteRenderer;
  Map<String, dynamic>? _cachedDtls;

  RTCRtpSender? _audioSender;
  RTCVideoRenderer get remoteRenderer => _remoteRenderer;

  /// Initialize WebRTC (audio only)
  Future<void> init([List<Map<String, dynamic>> iceServers = const []]) async {
    _remoteRenderer = RTCVideoRenderer();
    await _remoteRenderer.initialize();

    pc = await createPeerConnection({
      'iceServers': iceServers,
      'sdpSemantics': 'unified-plan',
    });

    // Attach remote audio handler EARLY
    pc.onTrack = (event) {
      if (event.track.kind == 'audio') {
        final stream = event.streams.isNotEmpty ? event.streams.first : null;
        if (stream != null) {
          if (!stream.getAudioTracks().contains(event.track)) {
            stream.addTrack(event.track); // ensure track is linked to a stream
          }
          // Bind to renderer so audio plays out the device speaker.
          _remoteRenderer.srcObject = stream;
        }
      }
    };

    // Get mic audio
    localStream = await navigator.mediaDevices.getUserMedia({
      'audio': {
        'echoCancellation': true,
        'noiseSuppression': true,
        'autoGainControl': true,
      },
      'video': false,
    });

    audioTrack = localStream.getAudioTracks().first;

    // Add track and keep sender reference
    _audioSender = await pc.addTrack(audioTrack, localStream);

    // Push-to-talk: start muted
    audioTrack.enabled = false;
  }

  /// Enable / disable mic (push-to-talk)
  void setMic(bool enabled) {
    audioTrack.enabled = enabled;
  }

  /// Force speakerphone on/off (mobile).
  Future<void> setSpeakerphone(bool on) async {
    await Helper.setSpeakerphoneOn(on);
  }

  /// Extract RTP parameters for mediasoup PRODUCE
  Map<String, dynamic> getRtpParameters() {
    final params = _audioSender!.parameters;

    // Convert existing params defensively (different flutter_webrtc versions expose different types)
    List<Map<String, dynamic>> codecs = (params.codecs ?? [])
        .map((c) => (c as dynamic).toMap?.call() ?? <String, dynamic>{})
        .where((m) => m.isNotEmpty)
        .cast<Map<String, dynamic>>()
        .toList();
    if (codecs.isEmpty) {
      // Fallback to a basic Opus codec
      codecs = [
        {
          'mimeType': 'audio/opus',
          'clockRate': 48000,
          'channels': 2,
          'payloadType': 111,
          'sdpFmtpLine': 'minptime=10;useinbandfec=1',
        }
      ];
    }

    List<Map<String, dynamic>> encodings = (params.encodings ?? [])
        .map((e) => (e as dynamic).toMap?.call() ?? <String, dynamic>{})
        .where((m) => m.isNotEmpty)
        .cast<Map<String, dynamic>>()
        .toList();
    if (encodings.isEmpty) {
      encodings = [
        {'ssrc': DateTime.now().millisecondsSinceEpoch}
      ];
    }

    final headerExtensions = (params.headerExtensions ?? [])
        .map((h) => (h as dynamic).toMap?.call() ?? <String, dynamic>{})
        .where((m) => m.isNotEmpty)
        .cast<Map<String, dynamic>>()
        .toList();

    return {
      'codecs': codecs,
      'encodings': encodings,
      'headerExtensions': headerExtensions,
      'rtcp': {
        'cname': localStream.id,
        'reducedSize': true,
      },
      'mid': '0',
    };
  }

  Future<void> _ensureDtlsFingerprint() async {
    if (_cachedDtls != null) return;

    String? _fingerprintFromSdp(String sdp) {
      final lines = sdp.split(RegExp(r'\r?\n'));
      for (final line in lines) {
        if (line.toLowerCase().startsWith('a=fingerprint:')) {
          final parts = line.split(RegExp(r'\s+'));
          if (parts.length >= 2) {
            return parts.sublist(1).join(' ').trim();
          }
        }
      }
      return null;
    }

    Map<String, dynamic> _dtlsFromFingerprint(String fpLine) {
      final firstSpace = fpLine.indexOf(' ');
      final algorithm = fpLine.substring(0, firstSpace).toLowerCase();
      final value = fpLine.substring(firstSpace + 1).trim();
      return {
        'role': 'auto',
        'fingerprints': [
          {
            'algorithm': algorithm,
            'value': value,
          }
        ],
      };
    }

    // Helper to read certificate stats from a connection
    Future<Map<String, dynamic>?> _tryStats(RTCPeerConnection target) async {
      try {
        final reports = await target.getStats();
        for (final r in reports) {
          try {
            final dyn = r as dynamic;
            if (dyn.type == 'certificate') {
              final values = (dyn.values as Map?) ?? const {};
              final fingerprint = (values['fingerprint'] as String?) ??
                  (values['fingerprintValue'] as String?);
              final algorithm = (values['fingerprintAlgorithm'] as String?) ??
                  (values['algorithm'] as String?) ??
                  'sha-256';
              if (fingerprint != null) {
                return {
                  'role': 'auto',
                  'fingerprints': [
                    {'algorithm': algorithm, 'value': fingerprint}
                  ],
                };
              }
            }
          } catch (_) {
            continue;
          }
        }
      } catch (_) {}
      return null;
    }

    // 1) Try stats on the main PC (no SDP mutation)
    final mainStats = await _tryStats(pc);
    if (mainStats != null) {
      _cachedDtls = mainStats;
      return;
    }

    // 2) Try creating an offer (without setting it) and parse fingerprint directly
    try {
      final offer = await pc.createOffer({
        'offerToReceiveAudio': false,
        'offerToReceiveVideo': false,
      });
      final sdp = offer.sdp ?? '';
      final fp = _fingerprintFromSdp(sdp);
      if (fp != null && fp.contains(' ')) {
        _cachedDtls = _dtlsFromFingerprint(fp);
        return;
      }
    } catch (_) {
      // ignore
    }

    // 3) Fallback: use a temporary RTCPeerConnection to obtain a fingerprint
    try {
      final tmp = await createPeerConnection({
        'sdpSemantics': 'unified-plan',
      });
      final offer = await tmp.createOffer({
        'offerToReceiveAudio': false,
        'offerToReceiveVideo': false,
      });
      try {
        await tmp.setLocalDescription(offer);
      } catch (_) {}

      final sdp = offer.sdp ?? '';
      final fp = _fingerprintFromSdp(sdp);
      if (fp != null && fp.contains(' ')) {
        _cachedDtls = _dtlsFromFingerprint(fp);
        await tmp.close();
        return;
      }

      final tmpStats = await _tryStats(tmp);
      await tmp.close();
      if (tmpStats != null) {
        _cachedDtls = tmpStats;
        return;
      }
    } catch (_) {
      // ignore
    }

    throw StateError('Unable to obtain DTLS fingerprint');
  }

  /// Extract DTLS parameters for CONNECT_TRANSPORT
  Future<Map<String, dynamic>> getDtlsParameters() async {
    if (_cachedDtls == null) {
      await _ensureDtlsFingerprint();
    }
    return _cachedDtls!;
  }

  /// Close everything
  Future<void> dispose() async {
    await pc.close();
    await localStream.dispose();
    await _remoteRenderer.dispose();
  }
}
