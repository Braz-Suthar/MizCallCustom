import 'dart:io';
import 'package:csv/csv.dart';
import 'package:path_provider/path_provider.dart';
import 'package:intl/intl.dart';

class ExportService {
  Future<String> exportHostsToCSV(List<Map<String, dynamic>> hosts) async {
    final rows = [
      ['Host ID', 'Name', 'Email', 'Status', 'Membership', 'Total Users', 'Total Calls', 'Created At'],
      ...hosts.map((host) => [
        host['id'] ?? '',
        host['displayName'] ?? host['name'] ?? '',
        host['email'] ?? '',
        host['enabled'] == true ? 'Active' : 'Disabled',
        host['membershipType'] ?? 'Free',
        host['totalUsers']?.toString() ?? '0',
        host['totalCalls']?.toString() ?? '0',
        host['createdAt'] ?? '',
      ]),
    ];

    final csv = const ListToCsvConverter().convert(rows);
    return await _saveFile(csv, 'hosts_export');
  }

  Future<String> exportUsersToCSV(List<Map<String, dynamic>> users) async {
    final rows = [
      ['User ID', 'Username', 'Host ID', 'Host Name', 'Status', 'Single Device'],
      ...users.map((user) => [
        user['id'] ?? '',
        user['username'] ?? '',
        user['hostId'] ?? user['host_id'] ?? '',
        user['hostName'] ?? user['host_name'] ?? '',
        user['enabled'] == true ? 'Active' : 'Disabled',
        user['enforceSingleDevice'] == true ? 'Yes' : 'No',
      ]),
    ];

    final csv = const ListToCsvConverter().convert(rows);
    return await _saveFile(csv, 'users_export');
  }

  Future<String> exportCallsToCSV(List<Map<String, dynamic>> calls) async {
    final rows = [
      ['Room ID', 'Host ID', 'Status', 'Started At', 'Ended At', 'Duration (min)'],
      ...calls.map((call) {
        final startedAt = call['started_at'] != null 
            ? DateTime.tryParse(call['started_at'])
            : null;
        final endedAt = call['ended_at'] != null 
            ? DateTime.tryParse(call['ended_at'])
            : null;
        
        String duration = 'N/A';
        if (startedAt != null && endedAt != null) {
          final diff = endedAt.difference(startedAt).inMinutes;
          duration = diff.toString();
        }

        return [
          call['id'] ?? '',
          call['host_id'] ?? '',
          call['status'] ?? '',
          startedAt != null ? DateFormat('yyyy-MM-dd HH:mm').format(startedAt) : '',
          endedAt != null ? DateFormat('yyyy-MM-dd HH:mm').format(endedAt) : '',
          duration,
        ];
      }),
    ];

    final csv = const ListToCsvConverter().convert(rows);
    return await _saveFile(csv, 'calls_export');
  }

  Future<String> _saveFile(String content, String prefix) async {
    final directory = await getDownloadsDirectory() ?? await getApplicationDocumentsDirectory();
    final timestamp = DateFormat('yyyyMMdd_HHmmss').format(DateTime.now());
    final filename = '${prefix}_$timestamp.csv';
    final file = File('${directory.path}/$filename');
    
    await file.writeAsString(content);
    return file.path;
  }
}
