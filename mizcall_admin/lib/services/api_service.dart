import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/app_config.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;

  ApiException(this.message, [this.statusCode]);

  @override
  String toString() => message;
}

class ApiService {
  String? _token;

  void setToken(String? token) {
    _token = token;
  }

  Map<String, String> get _headers {
    final headers = {
      'Content-Type': 'application/json',
    };
    if (_token != null) {
      headers['Authorization'] = 'Bearer $_token';
    }
    return headers;
  }

  Future<dynamic> get(String endpoint) async {
    try {
      final url = Uri.parse('${AppConfig.apiBaseUrl}$endpoint');
      final response = await http
          .get(url, headers: _headers)
          .timeout(AppConfig.apiTimeout);

      return _handleResponse(response);
    } catch (e) {
      throw ApiException('Network error: $e');
    }
  }

  Future<dynamic> post(String endpoint, Map<String, dynamic> body) async {
    try {
      final url = Uri.parse('${AppConfig.apiBaseUrl}$endpoint');
      final response = await http
          .post(url, headers: _headers, body: jsonEncode(body))
          .timeout(AppConfig.apiTimeout);

      return _handleResponse(response);
    } catch (e) {
      throw ApiException('Network error: $e');
    }
  }

  Future<dynamic> patch(String endpoint, Map<String, dynamic> body) async {
    try {
      final url = Uri.parse('${AppConfig.apiBaseUrl}$endpoint');
      final response = await http
          .patch(url, headers: _headers, body: jsonEncode(body))
          .timeout(AppConfig.apiTimeout);

      return _handleResponse(response);
    } catch (e) {
      throw ApiException('Network error: $e');
    }
  }

  Future<dynamic> delete(String endpoint) async {
    try {
      final url = Uri.parse('${AppConfig.apiBaseUrl}$endpoint');
      final response = await http
          .delete(url, headers: _headers)
          .timeout(AppConfig.apiTimeout);

      return _handleResponse(response);
    } catch (e) {
      throw ApiException('Network error: $e');
    }
  }

  dynamic _handleResponse(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) return null;
      return jsonDecode(response.body);
    } else {
      String errorMessage = 'Request failed';
      try {
        final errorBody = jsonDecode(response.body);
        errorMessage = errorBody['error'] ?? errorBody['message'] ?? errorMessage;
      } catch (_) {
        errorMessage = response.body.isNotEmpty 
          ? response.body 
          : 'Request failed with status ${response.statusCode}';
      }
      throw ApiException(errorMessage, response.statusCode);
    }
  }
}
