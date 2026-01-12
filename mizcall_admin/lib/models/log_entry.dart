enum LogLevel {
  info,
  warning,
  error,
  debug,
}

class LogEntry {
  final String id;
  final DateTime timestamp;
  final LogLevel level;
  final String service;
  final String message;
  final Map<String, dynamic>? metadata;

  LogEntry({
    required this.id,
    required this.timestamp,
    required this.level,
    required this.service,
    required this.message,
    this.metadata,
  });

  factory LogEntry.fromJson(Map<String, dynamic> json) {
    return LogEntry(
      id: json['id'] ?? '',
      timestamp: json['timestamp'] != null 
        ? DateTime.tryParse(json['timestamp']) ?? DateTime.now()
        : DateTime.now(),
      level: _parseLogLevel(json['level']),
      service: json['service'] ?? 'unknown',
      message: json['message'] ?? '',
      metadata: json['metadata'],
    );
  }

  static LogLevel _parseLogLevel(dynamic level) {
    if (level == null) return LogLevel.info;
    final levelStr = level.toString().toLowerCase();
    switch (levelStr) {
      case 'error':
        return LogLevel.error;
      case 'warning':
      case 'warn':
        return LogLevel.warning;
      case 'debug':
        return LogLevel.debug;
      default:
        return LogLevel.info;
    }
  }

  String get levelText {
    switch (level) {
      case LogLevel.error:
        return 'ERROR';
      case LogLevel.warning:
        return 'WARN';
      case LogLevel.debug:
        return 'DEBUG';
      case LogLevel.info:
        return 'INFO';
    }
  }
}
