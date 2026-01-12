class DashboardStats {
  final int totalHosts;
  final int activeHosts;
  final int totalUsers;
  final int activeUsers;
  final int totalCalls;
  final int activeCalls;
  final int totalRecordings;
  final String storageUsed;
  final String serverStatus;
  final String mediasoupStatus;
  final String databaseStatus;

  DashboardStats({
    this.totalHosts = 0,
    this.activeHosts = 0,
    this.totalUsers = 0,
    this.activeUsers = 0,
    this.totalCalls = 0,
    this.activeCalls = 0,
    this.totalRecordings = 0,
    this.storageUsed = '0 MB',
    this.serverStatus = 'Unknown',
    this.mediasoupStatus = 'Unknown',
    this.databaseStatus = 'Unknown',
  });

  factory DashboardStats.fromJson(Map<String, dynamic> json) {
    return DashboardStats(
      totalHosts: json['totalHosts'] ?? json['total_hosts'] ?? 0,
      activeHosts: json['activeHosts'] ?? json['active_hosts'] ?? 0,
      totalUsers: json['totalUsers'] ?? json['total_users'] ?? 0,
      activeUsers: json['activeUsers'] ?? json['active_users'] ?? 0,
      totalCalls: json['totalCalls'] ?? json['total_calls'] ?? 0,
      activeCalls: json['activeCalls'] ?? json['active_calls'] ?? 0,
      totalRecordings: json['totalRecordings'] ?? json['total_recordings'] ?? 0,
      storageUsed: json['storageUsed'] ?? json['storage_used'] ?? '0 MB',
      serverStatus: json['serverStatus'] ?? json['server_status'] ?? 'Unknown',
      mediasoupStatus: json['mediasoupStatus'] ?? json['mediasoup_status'] ?? 'Unknown',
      databaseStatus: json['databaseStatus'] ?? json['database_status'] ?? 'Unknown',
    );
  }
}
