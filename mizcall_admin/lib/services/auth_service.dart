import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../config/app_config.dart';
import '../models/admin_user.dart';
import 'api_service.dart';

class AuthService extends ChangeNotifier {
  final ApiService apiService;
  final SharedPreferences prefs;
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();
  
  // Callback for WebSocket connection
  Function(String?)? onTokenChanged;

  AdminUser? _currentUser;
  String? _token;
  String? _refreshToken;
  bool _isAuthenticated = false;

  AuthService({
    required this.apiService,
    required this.prefs,
  });

  AdminUser? get currentUser => _currentUser;
  String? get token => _token;
  bool get isAuthenticated => _isAuthenticated;

  Future<void> loadSavedToken() async {
    try {
      _token = await _secureStorage.read(key: AppConfig.tokenKey);
      _refreshToken = await _secureStorage.read(key: AppConfig.refreshTokenKey);
      final userJson = prefs.getString(AppConfig.userKey);

      if (_token != null && userJson != null) {
        _currentUser = AdminUser.fromJson(jsonDecode(userJson));
        _isAuthenticated = true;
        apiService.setToken(_token);
        notifyListeners();
      }
    } catch (e) {
      debugPrint('Failed to load saved session: $e');
    }
  }

  Future<void> login(String username, String password) async {
    try {
      final response = await apiService.post(
        AppConfig.loginEndpoint,
        {
          'username': username,
          'password': password,
        },
      );

      _token = response['token'];
      _refreshToken = response['refreshToken'];
      _currentUser = AdminUser.fromJson(response);

      // Save to secure storage
      await _secureStorage.write(key: AppConfig.tokenKey, value: _token);
      if (_refreshToken != null) {
        await _secureStorage.write(key: AppConfig.refreshTokenKey, value: _refreshToken);
      }
      await prefs.setString(AppConfig.userKey, jsonEncode(_currentUser!.toJson()));

      _isAuthenticated = true;
      apiService.setToken(_token);
      onTokenChanged?.call(_token);
      notifyListeners();
    } catch (e) {
      rethrow;
    }
  }

  Future<void> logout() async {
    _token = null;
    _refreshToken = null;
    _currentUser = null;
    _isAuthenticated = false;

    await _secureStorage.delete(key: AppConfig.tokenKey);
    await _secureStorage.delete(key: AppConfig.refreshTokenKey);
    await prefs.remove(AppConfig.userKey);

    apiService.setToken(null);
    onTokenChanged?.call(null);
    notifyListeners();
  }

  Future<void> refreshAccessToken() async {
    if (_refreshToken == null) {
      await logout();
      return;
    }

    try {
      final response = await apiService.post(
        '/auth/refresh',
        {'refreshToken': _refreshToken},
      );

      _token = response['token'];
      await _secureStorage.write(key: AppConfig.tokenKey, value: _token);
      apiService.setToken(_token);
      notifyListeners();
    } catch (e) {
      debugPrint('Token refresh failed: $e');
      await logout();
    }
  }
}
