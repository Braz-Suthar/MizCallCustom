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

  Future<AuthResult> registerHost(String name) async {
    final data = await _post(
      path: '/auth/host/register',
      payload: {'name': name},
    );
    final token = data['token'] as String?;
    final hostId = data['hostId'] as String?;
    if (token == null || hostId == null) {
      throw Exception('hostId/token missing in response');
    }
    return AuthResult(token: token, hostId: hostId);
  }

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
    final data = await _post(path: path, payload: payload);
    final token = data['token'] as String?;
    if (token == null) {
      throw Exception('Token missing in response');
    }
    return token;
  }

  Future<Map<String, dynamic>> _post({
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
      return jsonDecode(response.body) as Map<String, dynamic>;
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

class AuthResult {
  AuthResult({required this.token, required this.hostId});
  final String token;
  final String hostId;
}
