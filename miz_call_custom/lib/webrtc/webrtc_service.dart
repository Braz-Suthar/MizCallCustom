import 'package:flutter_webrtc/flutter_webrtc.dart';

class WebRTCService {
  late RTCPeerConnection pc;
  late MediaStream localStream;
  late MediaStreamTrack audioTrack;

  RTCRtpSender? _audioSender;

  /// Initialize WebRTC (audio only)
  Future<void> init(List<Map<String, dynamic>> iceServers) async {
    pc = await createPeerConnection({
    'iceServers': iceServers,
    'sdpSemantics': 'unified-plan',
  });

    // Attach remote audio handler EARLY
    pc.onTrack = (event) {
      if (event.track.kind == 'audio') {
        final stream = event.streams.isNotEmpty ? event.streams.first : null;
        if (stream != null && !stream.getAudioTracks().contains(event.track)) {
          stream.addTrack(event.track); // ensure track is linked to a stream
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

  /// Extract RTP parameters for mediasoup PRODUCE
  Map<String, dynamic> getRtpParameters() {
    final params = _audioSender!.parameters;
    return params.toMap();
  }

  /// Extract DTLS parameters for CONNECT_TRANSPORT
  Future<Map<String, dynamic>> getDtlsParameters() async {
    final stats = await pc.getStats();
    final certificateReport = stats.firstWhere(
      (report) => report.type == 'certificate',
      orElse: () => throw StateError('No certificate stats available'),
    );

    final fingerprint =
        (certificateReport.values['fingerprint'] as String?) ??
            (certificateReport.values['fingerprintValue'] as String?);
    final algorithm =
        (certificateReport.values['fingerprintAlgorithm'] as String?) ??
            (certificateReport.values['algorithm'] as String?) ??
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

  /// Close everything
  Future<void> dispose() async {
    await pc.close();
    await localStream.dispose();
  }
}
