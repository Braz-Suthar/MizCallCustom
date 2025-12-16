import 'package:shared_preferences/shared_preferences.dart';

class Session {
  static const _kToken = 'auth_token';
  static const _kRole = 'auth_role';
  static const _kHostId = 'auth_host_id';

  static Future<void> save({
    required String token,
    required String role,
    String? hostId,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kToken, token);
    await prefs.setString(_kRole, role);
    if (hostId != null) {
      await prefs.setString(_kHostId, hostId);
    } else {
      await prefs.remove(_kHostId);
    }
  }

  static Future<StoredSession?> load() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(_kToken);
    final role = prefs.getString(_kRole);
    if (token == null || role == null) return null;
    final hostId = prefs.getString(_kHostId);
    return StoredSession(token: token, role: role, hostId: hostId);
  }

  static Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_kToken);
    await prefs.remove(_kRole);
    await prefs.remove(_kHostId);
  }
}

class StoredSession {
  StoredSession({required this.token, required this.role, this.hostId});
  final String token;
  final String role; // 'host' or 'user'
  final String? hostId;
}

