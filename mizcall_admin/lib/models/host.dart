class Host {
  final String id;
  final String name;
  final String? displayName;
  final String? email;
  final String? avatarUrl;
  final bool enabled;
  final bool twoFactorEnabled;
  final bool emailOtpEnabled;
  final bool mobileOtpEnabled;
  final String? phoneNumber;
  final bool? allowMultipleSessions;
  final bool? enforceUserSingleSession;
  final int? totalUsers;
  final int? activeUsers;
  final int? totalCalls;
  final String? callBackgroundUrl;
  final DateTime? createdAt;
  final DateTime? lastLoginAt;

  Host({
    required this.id,
    required this.name,
    this.displayName,
    this.email,
    this.avatarUrl,
    this.enabled = true,
    this.twoFactorEnabled = false,
    this.emailOtpEnabled = false,
    this.mobileOtpEnabled = false,
    this.phoneNumber,
    this.allowMultipleSessions,
    this.enforceUserSingleSession,
    this.totalUsers,
    this.activeUsers,
    this.totalCalls,
    this.callBackgroundUrl,
    this.createdAt,
    this.lastLoginAt,
  });

  factory Host.fromJson(Map<String, dynamic> json) {
    return Host(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      displayName: json['displayName'] ?? json['display_name'],
      email: json['email'],
      avatarUrl: json['avatarUrl'] ?? json['avatar_url'],
      enabled: json['enabled'] ?? true,
      twoFactorEnabled: json['twoFactorEnabled'] ?? json['two_factor_enabled'] ?? false,
      emailOtpEnabled: json['emailOtpEnabled'] ?? json['email_otp_enabled'] ?? false,
      mobileOtpEnabled: json['mobileOtpEnabled'] ?? json['mobile_otp_enabled'] ?? false,
      phoneNumber: json['phoneNumber'] ?? json['phone_number'],
      allowMultipleSessions: json['allowMultipleSessions'] ?? json['allow_multiple_sessions'],
      enforceUserSingleSession: json['enforceUserSingleSession'] ?? json['enforce_user_single_session'],
      totalUsers: json['totalUsers'] ?? json['total_users'],
      activeUsers: json['activeUsers'] ?? json['active_users'],
      totalCalls: json['totalCalls'] ?? json['total_calls'],
      callBackgroundUrl: json['callBackgroundUrl'] ?? json['call_background_url'],
      createdAt: json['createdAt'] != null 
        ? DateTime.tryParse(json['createdAt']) 
        : (json['created_at'] != null ? DateTime.tryParse(json['created_at']) : null),
      lastLoginAt: json['lastLoginAt'] != null 
        ? DateTime.tryParse(json['lastLoginAt']) 
        : (json['last_login_at'] != null ? DateTime.tryParse(json['last_login_at']) : null),
    );
  }

  String get displayLabel => displayName ?? email ?? name;
  
  String get statusText => enabled ? 'Active' : 'Disabled';
  
  String get twoFactorStatus {
    if (!twoFactorEnabled) return 'Disabled';
    final methods = <String>[];
    if (emailOtpEnabled) methods.add('Email');
    if (mobileOtpEnabled) methods.add('Mobile');
    return methods.isEmpty ? 'Disabled' : methods.join(', ');
  }
}
