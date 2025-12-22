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

  Future<UserLoginResult> loginUser(String userId, String password) async {
    final data = await _post(
      path: '/auth/user/login',
      payload: {
        'userId': userId,
        'password': password,
      },
    );
    final token = data['token'] as String?;
    if (token == null) throw Exception('Token missing in response');
    return UserLoginResult(token: token, hostId: data['hostId'] as String?);
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

  Future<void> endCall({
    required String token,
    required String callId,
  }) async {
    await _patch(
      path: '/host/calls/$callId/end',
      bearer: token,
      payload: const {},
    );
  }

  Future<List<UserRecordingGroup>> fetchUserRecordings({
    required String token,
  }) async {
    final data = await _get(path: '/recordings/user', bearer: token);
    if (data.isEmpty) return const [];

    final groups = <UserRecordingGroup>[];
    data.forEach((key, value) {
      final entries = (value as List<dynamic>? ?? [])
          .map((e) => UserRecording.fromMap(e as Map<String, dynamic>))
          .toList();
      groups.add(UserRecordingGroup(date: key, recordings: entries));
    });
    groups.sort((a, b) => b.date.compareTo(a.date)); // newest first
    return groups;
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

class UserLoginResult {
  UserLoginResult({required this.token, this.hostId});
  final String token;
  final String? hostId;
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

class UserRecording {
  UserRecording({
    required this.id,
    required this.startTime,
    this.endTime,
    this.filePath,
    this.meetingId,
    this.hostId,
  });

  final String id;
  final DateTime startTime;
  final DateTime? endTime;
  final String? filePath;
  final String? meetingId;
  final String? hostId;

  factory UserRecording.fromMap(Map<String, dynamic> map) {
    DateTime? _parse(dynamic v) {
      if (v == null) return null;
      return DateTime.tryParse(v.toString());
    }

    return UserRecording(
      id: map['id']?.toString() ?? '',
      startTime: _parse(map['start_time']) ?? DateTime.now(),
      endTime: _parse(map['end_time']),
      filePath: map['file_path']?.toString(),
      meetingId: map['meeting_id']?.toString(),
      hostId: map['host_id']?.toString(),
    );
  }
}

class UserRecordingGroup {
  UserRecordingGroup({required this.date, required this.recordings});

  final String date;
  final List<UserRecording> recordings;
}
