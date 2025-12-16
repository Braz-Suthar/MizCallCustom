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
    String? bearer,
  }) async {
    final uri = Uri.parse('$baseUrl$path');
    final response = await _client.post(
      uri,
      headers: {
        'Content-Type': 'application/json',
        if (bearer != null) 'Authorization': 'Bearer $bearer',
      },
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

  Future<Map<String, dynamic>> _patch({
    required String path,
    required Map<String, dynamic> payload,
    String? bearer,
  }) async {
    final uri = Uri.parse('$baseUrl$path');
    final response = await _client.patch(
      uri,
      headers: {
        'Content-Type': 'application/json',
        if (bearer != null) 'Authorization': 'Bearer $bearer',
      },
      body: jsonEncode(payload),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) return {};
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

  Future<CreatedUser> createUser({
    required String token,
    required String username,
    String? password,
  }) async {
    final data = await _post(
      path: '/host/users',
      bearer: token,
      payload: {
        'username': username,
        if (password != null && password.isNotEmpty) 'password': password,
      },
    );
    final userId = data['userId'] as String?;
    final pwd = data['password'] as String?;
    if (userId == null) throw Exception('userId missing in response');
    return CreatedUser(userId: userId, password: pwd);
  }

  Future<String> startHostCall({required String token}) async {
    final data = await _post(
      path: '/host/calls/start',
      bearer: token,
      payload: const {},
    );
    final roomId = data['roomId'] as String?;
    if (roomId == null) throw Exception('roomId missing in response');
    return roomId;
  }

  Future<List<HostUser>> fetchUsers({required String token}) async {
    final data = await _get(path: '/host/users', bearer: token);
    final list = data['users'] as List<dynamic>? ?? [];
    return list
        .map((e) => HostUser.fromMap(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<HostCall>> fetchCalls({required String token}) async {
    final data = await _get(path: '/host/calls', bearer: token);
    final list = data['calls'] as List<dynamic>? ?? [];
    return list
        .map((e) => HostCall.fromMap(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> setUserEnabled({
    required String token,
    required String userId,
    required bool enabled,
  }) async {
    await _patch(
      path: '/host/users/$userId',
      bearer: token,
      payload: {'enabled': enabled},
    );
  }

  Future<void> deleteUser({
    required String token,
    required String userId,
  }) async {
    final uri = Uri.parse('$baseUrl/host/users/$userId');
    final response = await _client.delete(
      uri,
      headers: {'Authorization': 'Bearer $token'},
    );
    if (response.statusCode >= 200 && response.statusCode < 300) return;
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

  Future<Map<String, dynamic>> _get({
    required String path,
    String? bearer,
  }) async {
    final uri = Uri.parse('$baseUrl$path');
    final response = await _client.get(
      uri,
      headers: {
        if (bearer != null) 'Authorization': 'Bearer $bearer',
      },
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

class CreatedUser {
  CreatedUser({required this.userId, this.password});
  final String userId;
  final String? password;
}

class HostUser {
  HostUser({
    required this.id,
    required this.username,
    required this.enabled,
    this.lastSpeaking,
  });

  final String id;
  final String username;
  final bool enabled;
  final String? lastSpeaking;

  factory HostUser.fromMap(Map<String, dynamic> map) {
    return HostUser(
      id: map['id'] as String,
      username: map['username'] as String,
      enabled: (map['enabled'] as bool?) ?? true,
      lastSpeaking: map['last_speaking']?.toString(),
    );
  }
}

class HostCall {
  HostCall({
    required this.id,
    required this.status,
    required this.startedAt,
    this.endedAt,
  });

  final String id;
  final String status;
  final String startedAt;
  final String? endedAt;

  factory HostCall.fromMap(Map<String, dynamic> map) {
    return HostCall(
      id: map['id'] as String,
      status: map['status']?.toString() ?? '',
      startedAt: map['started_at']?.toString() ?? '',
      endedAt: map['ended_at']?.toString(),
    );
  }
}
