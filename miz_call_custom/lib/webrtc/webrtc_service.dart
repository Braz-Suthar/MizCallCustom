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
    return params.toMap();
  }

  /// Extract DTLS parameters for CONNECT_TRANSPORT
  Future<Map<String, dynamic>> getDtlsParameters() async {
    if (_cachedDtls != null) return _cachedDtls!;

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

    Future<Map<String, dynamic>> _dtlsFromStats() async {
      final reports = await pc.getStats();
      Map values = const {};
      try {
        for (final r in reports) {
          try {
            final dyn = r as dynamic;
            if (dyn.type == 'certificate') {
              values = (dyn.values as Map?) ?? const {};
              break;
            }
          } catch (_) {
            continue;
          }
        }
      } catch (_) {
        // ignore
      }

      if (values.isEmpty) {
        throw StateError('No certificate stats available');
      }

      final fingerprint =
          (values['fingerprint'] as String?) ??
              (values['fingerprintValue'] as String?);
      final algorithm =
          (values['fingerprintAlgorithm'] as String?) ??
              (values['algorithm'] as String?) ??
              'sha-256';
      if (fingerprint == null) {
        throw StateError('No DTLS fingerprint found');
      }
      return {
        'role': 'auto',
        'fingerprints': [
          {
            'algorithm': algorithm,
            'value': fingerprint,
          }
        ],
      };
    }

    // Always create a fresh offer and use its SDP to extract fingerprint; fallback to stats.
    final offer = await pc.createOffer({
      'offerToReceiveAudio': true,
      'offerToReceiveVideo': false,
    });
    await pc.setLocalDescription(offer);
    final sdp = offer.sdp ?? '';
    final fp = _fingerprintFromSdp(sdp);
    if (fp != null && fp.contains(' ')) {
      _cachedDtls = _dtlsFromFingerprint(fp);
      return _cachedDtls!;
    }

    // Fallback to stats-based fingerprint
    _cachedDtls = await _dtlsFromStats();
    return _cachedDtls!;

  }

  /// Close everything
  Future<void> dispose() async {
    await pc.close();
    await localStream.dispose();
    await _remoteRenderer.dispose();
  }
}
