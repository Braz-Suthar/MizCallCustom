class AppConfig {
  static const String appName = 'MizCall Admin';
  static const String appVersion = '1.0.0';
  
  // API Configuration
  static const String apiBaseUrl = 'https://custom.mizcall.com';
  
  // Endpoints
  static const String loginEndpoint = '/admin/login';
  static const String dashboardStatsEndpoint = '/admin/dashboard';
  static const String hostsEndpoint = '/admin/hosts';
  static const String hostDetailsEndpoint = '/admin/hosts';
  static const String logsEndpoint = '/admin/logs';
  
  // Pagination
  static const int defaultPageSize = 20;
  static const int maxPageSize = 100;
  
  // Timeouts
  static const Duration apiTimeout = Duration(seconds: 30);
  static const Duration connectionTimeout = Duration(seconds: 15);
  
  // Storage Keys
  static const String tokenKey = 'admin_token';
  static const String refreshTokenKey = 'admin_refresh_token';
  static const String userKey = 'admin_user';
  
  // WebSocket
  static const String wsBaseUrl = 'wss://custom.mizcall.com';
  static const String logsWsEndpoint = '/admin/logs/stream';
}
