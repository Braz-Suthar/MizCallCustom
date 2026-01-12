import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

import '../config/app_config.dart';
import '../models/log_entry.dart';

class WebSocketService extends ChangeNotifier {
  WebSocketChannel? _channel;
  StreamSubscription? _subscription;
  bool _isConnected = false;
  String? _token;

  final StreamController<LogEntry> _logsController = StreamController<LogEntry>.broadcast();
  final StreamController<Map<String, dynamic>> _statsController = StreamController<Map<String, dynamic>>.broadcast();

  Stream<LogEntry> get logsStream => _logsController.stream;
  Stream<Map<String, dynamic>> get statsStream => _statsController.stream;
  bool get isConnected => _isConnected;

  void setToken(String? token) {
    _token = token;
  }

  void connect() {
    if (_isConnected || _token == null) return;

    try {
      final wsUrl = '${AppConfig.wsBaseUrl}/admin/ws?token=$_token';
      _channel = WebSocketChannel.connect(Uri.parse(wsUrl));
      
      _subscription = _channel!.stream.listen(
        _handleMessage,
        onError: _handleError,
        onDone: _handleDone,
      );

      _isConnected = true;
      notifyListeners();
      debugPrint('[WebSocket] Connected');
    } catch (e) {
      debugPrint('[WebSocket] Connection error: $e');
      _isConnected = false;
      notifyListeners();
    }
  }

  void _handleMessage(dynamic message) {
    try {
      final data = jsonDecode(message);
      final type = data['type'];

      switch (type) {
        case 'log':
          final log = LogEntry.fromJson(data['data']);
          _logsController.add(log);
          break;
        case 'stats':
          _statsController.add(data['data']);
          break;
        default:
          debugPrint('[WebSocket] Unknown message type: $type');
      }
    } catch (e) {
      debugPrint('[WebSocket] Message parse error: $e');
    }
  }

  void _handleError(error) {
    debugPrint('[WebSocket] Error: $error');
    _isConnected = false;
    notifyListeners();
    
    // Attempt to reconnect after 5 seconds
    Future.delayed(const Duration(seconds: 5), () {
      if (!_isConnected) {
        connect();
      }
    });
  }

  void _handleDone() {
    debugPrint('[WebSocket] Connection closed');
    _isConnected = false;
    notifyListeners();
  }

  void disconnect() {
    _subscription?.cancel();
    _channel?.sink.close();
    _isConnected = false;
    notifyListeners();
    debugPrint('[WebSocket] Disconnected');
  }

  @override
  void dispose() {
    disconnect();
    _logsController.close();
    _statsController.close();
    super.dispose();
  }
}
