import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

import '../config/theme.dart';
import '../config/app_config.dart';
import '../models/host.dart';
import '../services/api_service.dart';

class HostDetailsScreen extends StatefulWidget {
  final String hostId;

  const HostDetailsScreen({super.key, required this.hostId});

  @override
  State<HostDetailsScreen> createState() => _HostDetailsScreenState();
}

class _HostDetailsScreenState extends State<HostDetailsScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  Host? _host;
  List<dynamic> _users = [];
  List<dynamic> _calls = [];
  List<dynamic> _sessions = [];

  @override
  void initState() {
    super.initState();
    _loadHostDetails();
  }

  Future<void> _loadHostDetails() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final apiService = context.read<ApiService>();
      
      // Load host details
      final hostResponse = await apiService.get('${AppConfig.hostDetailsEndpoint}/${widget.hostId}');
      
      // Load users for this host
      final usersResponse = await apiService.get('${AppConfig.hostDetailsEndpoint}/${widget.hostId}/users');
      
      // Load recent calls
      final callsResponse = await apiService.get('${AppConfig.hostDetailsEndpoint}/${widget.hostId}/calls');
      
      // Load active sessions
      final sessionsResponse = await apiService.get('${AppConfig.hostDetailsEndpoint}/${widget.hostId}/sessions');
      
      setState(() {
        _host = Host.fromJson(hostResponse);
        _users = usersResponse['users'] ?? [];
        _calls = callsResponse['calls'] ?? [];
        _sessions = sessionsResponse['sessions'] ?? [];
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceFirst('ApiException: ', '');
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: theme.cardTheme.color,
              border: Border(
                bottom: BorderSide(
                  color: theme.brightness == Brightness.dark
                      ? AppTheme.darkBorder
                      : AppTheme.lightBorder,
                  width: 1,
                ),
              ),
            ),
            child: Row(
              children: [
                IconButton(
                  onPressed: () => context.go('/hosts'),
                  icon: const Icon(Icons.arrow_back),
                  tooltip: 'Back to Hosts',
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _host?.displayLabel ?? widget.hostId,
                        style: theme.textTheme.displaySmall?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Host ID: ${widget.hostId}',
                        style: theme.textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
                ElevatedButton.icon(
                  onPressed: _loadHostDetails,
                  icon: _isLoading
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                      : const Icon(Icons.refresh, size: 20),
                  label: const Text('Refresh'),
                ),
              ],
            ),
          ),

          // Content
          Expanded(
            child: _isLoading && _host == null
                ? const Center(child: CircularProgressIndicator())
                : _errorMessage != null
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.error_outline,
                              size: 64,
                              color: AppTheme.dangerRed.withOpacity(0.5),
                            ),
                            const SizedBox(height: 16),
                            Text('Failed to load host details', style: theme.textTheme.titleLarge),
                            const SizedBox(height: 8),
                            Text(_errorMessage!, style: theme.textTheme.bodySmall),
                            const SizedBox(height: 24),
                            ElevatedButton.icon(
                              onPressed: _loadHostDetails,
                              icon: const Icon(Icons.refresh),
                              label: const Text('Retry'),
                            ),
                          ],
                        ),
                      )
                    : SingleChildScrollView(
                        padding: const EdgeInsets.all(32),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Host Info Card
                            _buildHostInfoCard(),
                            const SizedBox(height: 24),

                            // Stats Row
                            Row(
                              children: [
                                Expanded(child: _buildQuickStat('Total Users', _host!.totalUsers?.toString() ?? '0', Icons.people)),
                                const SizedBox(width: 16),
                                Expanded(child: _buildQuickStat('Active Users', _host!.activeUsers?.toString() ?? '0', Icons.person)),
                                const SizedBox(width: 16),
                                Expanded(child: _buildQuickStat('Total Calls', _host!.totalCalls?.toString() ?? '0', Icons.call)),
                                const SizedBox(width: 16),
                                Expanded(child: _buildQuickStat('Active Sessions', _sessions.length.toString(), Icons.devices)),
                              ],
                            ),
                            const SizedBox(height: 24),

                            // Tabs
                            DefaultTabController(
                              length: 3,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  TabBar(
                                    labelColor: AppTheme.primaryBlue,
                                    unselectedLabelColor: theme.textTheme.bodySmall?.color,
                                    indicatorColor: AppTheme.primaryBlue,
                                    tabs: const [
                                      Tab(text: 'Users'),
                                      Tab(text: 'Call History'),
                                      Tab(text: 'Sessions'),
                                    ],
                                  ),
                                  const SizedBox(height: 20),
                                  SizedBox(
                                    height: 400,
                                    child: TabBarView(
                                      children: [
                                        _buildUsersTab(),
                                        _buildCallsTab(),
                                        _buildSessionsTab(),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildHostInfoCard() {
    final theme = Theme.of(context);
    
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Host Information',
              style: theme.textTheme.titleLarge,
            ),
            const SizedBox(height: 20),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Avatar
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [AppTheme.primaryBlue, Color(0xFF2563EB)],
                    ),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: _host!.avatarUrl != null
                      ? ClipRRect(
                          borderRadius: BorderRadius.circular(16),
                          child: Image.network(
                            _host!.avatarUrl!.startsWith('http')
                                ? _host!.avatarUrl!
                                : '${AppConfig.apiBaseUrl}${_host!.avatarUrl}',
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) {
                              return Center(
                                child: Text(
                                  _host!.name[0].toUpperCase(),
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 32,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              );
                            },
                          ),
                        )
                      : Center(
                          child: Text(
                            _host!.name[0].toUpperCase(),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 32,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                ),
                const SizedBox(width: 24),

                // Details
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildDetailRow('Display Name', _host!.displayName ?? 'Not set'),
                      const SizedBox(height: 12),
                      _buildDetailRow('Email', _host!.email ?? 'Not set'),
                      const SizedBox(height: 12),
                      _buildDetailRow('Host ID', _host!.id),
                    ],
                  ),
                ),

                // Security Info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildDetailRow('Status', _host!.statusText, 
                        valueColor: _host!.enabled ? AppTheme.successGreen : AppTheme.dangerRed),
                      const SizedBox(height: 12),
                      _buildDetailRow('2FA', _host!.twoFactorStatus,
                        valueColor: _host!.twoFactorEnabled ? AppTheme.successGreen : null),
                      const SizedBox(height: 12),
                      _buildDetailRow('Multiple Sessions', 
                        _host!.allowMultipleSessions == true ? 'Allowed' : 'Not Allowed'),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value, {Color? valueColor}) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: theme.textTheme.bodySmall),
        const SizedBox(height: 4),
        Text(
          value,
          style: theme.textTheme.titleMedium?.copyWith(
            color: valueColor,
          ),
        ),
      ],
    );
  }

  Widget _buildQuickStat(String label, String value, IconData icon) {
    final theme = Theme.of(context);
    
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Icon(icon, size: 32, color: AppTheme.primaryBlue),
            const SizedBox(height: 12),
            Text(
              value,
              style: theme.textTheme.displaySmall?.copyWith(
                color: AppTheme.primaryBlue,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 4),
            Text(label, style: theme.textTheme.bodySmall),
          ],
        ),
      ),
    );
  }

  Widget _buildUsersTab() {
    final theme = Theme.of(context);
    
    if (_users.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.people_outline, size: 64, color: theme.textTheme.bodySmall?.color),
            const SizedBox(height: 16),
            Text('No users found', style: theme.textTheme.titleMedium),
          ],
        ),
      );
    }

    return ListView.separated(
      itemCount: _users.length,
      separatorBuilder: (context, index) => const Divider(height: 1),
      itemBuilder: (context, index) {
        final user = _users[index];
        return ListTile(
          leading: CircleAvatar(
            backgroundColor: AppTheme.secondaryBlue,
            child: Text(
              (user['username'] ?? 'U')[0].toUpperCase(),
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
            ),
          ),
          title: Text(user['username'] ?? 'Unknown'),
          subtitle: Text('ID: ${user['id']}'),
          trailing: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: (user['enabled'] ?? false)
                  ? AppTheme.successGreen.withOpacity(0.1)
                  : AppTheme.dangerRed.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              (user['enabled'] ?? false) ? 'Active' : 'Disabled',
              style: TextStyle(
                color: (user['enabled'] ?? false) ? AppTheme.successGreen : AppTheme.dangerRed,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildCallsTab() {
    final theme = Theme.of(context);
    
    if (_calls.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.call_outlined, size: 64, color: theme.textTheme.bodySmall?.color),
            const SizedBox(height: 16),
            Text('No calls found', style: theme.textTheme.titleMedium),
          ],
        ),
      );
    }

    return ListView.separated(
      itemCount: _calls.length,
      separatorBuilder: (context, index) => const Divider(height: 1),
      itemBuilder: (context, index) {
        final call = _calls[index];
        final startedAt = call['started_at'] != null 
            ? DateTime.tryParse(call['started_at'])
            : null;
        final endedAt = call['ended_at'] != null 
            ? DateTime.tryParse(call['ended_at'])
            : null;
        
        return ListTile(
          leading: Icon(
            call['status'] == 'started' ? Icons.call : Icons.call_end,
            color: call['status'] == 'started' 
                ? AppTheme.successGreen 
                : theme.textTheme.bodySmall?.color,
          ),
          title: Text('Room: ${call['id']}'),
          subtitle: Text(
            startedAt != null 
                ? 'Started: ${DateFormat('MMM dd, yyyy - HH:mm').format(startedAt)}'
                : 'Unknown start time',
          ),
          trailing: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: call['status'] == 'started'
                  ? AppTheme.successGreen.withOpacity(0.1)
                  : theme.textTheme.bodySmall?.color?.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              call['status'] ?? 'Unknown',
              style: TextStyle(
                color: call['status'] == 'started' 
                    ? AppTheme.successGreen 
                    : theme.textTheme.bodySmall?.color,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildSessionsTab() {
    final theme = Theme.of(context);
    
    if (_sessions.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.devices_outlined, size: 64, color: theme.textTheme.bodySmall?.color),
            const SizedBox(height: 16),
            Text('No active sessions', style: theme.textTheme.titleMedium),
          ],
        ),
      );
    }

    return ListView.separated(
      itemCount: _sessions.length,
      separatorBuilder: (context, index) => const Divider(height: 1),
      itemBuilder: (context, index) {
        final session = _sessions[index];
        final lastSeen = session['lastSeenAt'] != null 
            ? DateTime.tryParse(session['lastSeenAt'])
            : (session['last_seen_at'] != null 
                ? DateTime.tryParse(session['last_seen_at'])
                : null);
        
        return ListTile(
          leading: Icon(
            _getPlatformIcon(session['platform']),
            color: AppTheme.primaryBlue,
          ),
          title: Text(session['deviceLabel'] ?? session['device_label'] ?? 'Unknown Device'),
          subtitle: Text(
            lastSeen != null 
                ? 'Last seen: ${DateFormat('MMM dd, HH:mm').format(lastSeen)}'
                : 'Unknown',
          ),
          trailing: Icon(
            Icons.circle,
            size: 12,
            color: AppTheme.successGreen,
          ),
        );
      },
    );
  }

  IconData _getPlatformIcon(String? platform) {
    if (platform == null) return Icons.devices;
    final p = platform.toLowerCase();
    if (p.contains('ios')) return Icons.phone_iphone;
    if (p.contains('android')) return Icons.android;
    if (p.contains('mac')) return Icons.computer;
    if (p.contains('windows')) return Icons.desktop_windows;
    if (p.contains('linux')) return Icons.computer;
    return Icons.devices;
  }
}
