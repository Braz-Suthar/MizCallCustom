import '../config/app_config.dart';
import 'api_service.dart';

class HostService {
  final ApiService apiService;

  HostService({required this.apiService});

  Future<void> createHost({
    required String email,
    required String password,
    String? displayName,
    String membershipType = 'Free',
    DateTime? membershipEndDate,
  }) async {
    await apiService.post('/admin/hosts', {
      'email': email,
      'password': password,
      'displayName': displayName,
      'membershipType': membershipType,
      'membershipEndDate': membershipEndDate?.toIso8601String(),
    });
  }

  Future<void> updateHost({
    required String hostId,
    String? displayName,
    String? email,
    bool? enabled,
  }) async {
    await apiService.patch('/admin/hosts/$hostId', {
      if (displayName != null) 'displayName': displayName,
      if (email != null) 'email': email,
      if (enabled != null) 'enabled': enabled,
    });
  }

  Future<void> resetPassword({
    required String hostId,
    required String newPassword,
  }) async {
    await apiService.post('/admin/hosts/$hostId/reset-password', {
      'newPassword': newPassword,
    });
  }

  Future<void> updateSubscription({
    required String hostId,
    String? membershipType,
    DateTime? membershipEndDate,
    String? action, // 'end' or 'renew'
  }) async {
    await apiService.patch('/admin/hosts/$hostId/subscription', {
      if (action != null) 'action': action,
      if (membershipType != null) 'membershipType': membershipType,
      if (membershipEndDate != null) 'membershipEndDate': membershipEndDate.toIso8601String(),
    });
  }

  Future<void> deleteHost(String hostId) async {
    await apiService.delete('/admin/hosts/$hostId');
  }
}
