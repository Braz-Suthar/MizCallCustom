class AdminUser {
  final String id;
  final String username;
  final String? email;
  final String? name;
  final DateTime? createdAt;

  AdminUser({
    required this.id,
    required this.username,
    this.email,
    this.name,
    this.createdAt,
  });

  factory AdminUser.fromJson(Map<String, dynamic> json) {
    return AdminUser(
      id: json['id'] ?? '',
      username: json['username'] ?? '',
      email: json['email'],
      name: json['name'],
      createdAt: json['createdAt'] != null 
        ? DateTime.tryParse(json['createdAt']) 
        : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'email': email,
      'name': name,
      'createdAt': createdAt?.toIso8601String(),
    };
  }
}
