import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:permission_handler/permission_handler.dart';

import 'config.dart';

Future<void> requestMicPermission() async {
  final status = await Permission.microphone.request();
  if (!status.isGranted) {
    throw Exception("Microphone permission denied");
  }
}

class AuthService {
  AuthService({
    http.Client? client,
    this.baseUrl = apiBaseUrl,
  }) : _client = client ?? http.Client();

  final http.Client _client;
  final String baseUrl;

  Future<String> loginHost(String hostId) {
    return _postForToken(
      path: '/auth/host/login',
      payload: {'hostId': hostId},
    );
  }

  Future<String> loginUser(String userId, String password) {
    return _postForToken(
      path: '/auth/user/login',
      payload: {
        'userId': userId,
        'password': password,
      },
    );
  }

  Future<String> _postForToken({
    required String path,
    required Map<String, dynamic> payload,
  }) async {
    final uri = Uri.parse('$baseUrl$path');
    final response = await _client.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(payload),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      final token = data['token'] as String?;
      if (token == null) {
        throw Exception('Token missing in response');
      }
      return token;
    }

    try {
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      final message = data['error'] ?? data['message'] ?? response.body;
      throw Exception(message.toString());
    } catch (_) {
      throw Exception(
        'Auth request failed (${response.statusCode}): ${response.body}',
      );
    }
  }
}
