import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

import '../config/theme.dart';
import '../config/app_config.dart';
import '../models/host.dart';
import '../services/api_service.dart';
import '../services/host_service.dart';
import '../services/export_service.dart';

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
            padding: EdgeInsets.all(MediaQuery.of(context).size.width < 800 ? 16 : 32),
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
            child: LayoutBuilder(
              builder: (context, constraints) {
                final isMobile = constraints.maxWidth < 600;
                
                if (isMobile) {
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          IconButton(
                            onPressed: () => context.go('/hosts'),
                            icon: const Icon(Icons.arrow_back),
                            tooltip: 'Back',
                          ),
                          Expanded(
                            child: Text(
                              _host?.displayLabel ?? widget.hostId,
                              style: theme.textTheme.titleLarge?.copyWith(
                                fontWeight: FontWeight.w800,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          PopupMenuButton<String>(
                            icon: const Icon(Icons.more_vert),
                            tooltip: 'Actions',
                            onSelected: _handleAction,
                            itemBuilder: (context) => _buildActionMenuItems(),
                          ),
                          IconButton(
                            onPressed: _loadHostDetails,
                            icon: _isLoading
                                ? const SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(strokeWidth: 2),
                                  )
                                : const Icon(Icons.refresh),
                            tooltip: 'Refresh',
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Padding(
                        padding: const EdgeInsets.only(left: 48),
                        child: Text(
                          'ID: ${widget.hostId}',
                          style: theme.textTheme.bodySmall,
                        ),
                      ),
                    ],
                  );
                }
                
                return Row(
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
                    PopupMenuButton<String>(
                      icon: const Icon(Icons.more_vert),
                      tooltip: 'Actions',
                      onSelected: _handleAction,
                      itemBuilder: (context) => _buildActionMenuItems(),
                    ),
                    const SizedBox(width: 8),
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
                );
              },
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
                        padding: EdgeInsets.all(MediaQuery.of(context).size.width < 800 ? 16 : 32),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Host Info Card
                            _buildHostInfoCard(),
                            const SizedBox(height: 24),

                            // Subscription Details Card
                            _buildSubscriptionCard(),
                            const SizedBox(height: 24),

                            // Stats Row (Responsive)
                            LayoutBuilder(
                              builder: (context, constraints) {
                                if (constraints.maxWidth < 800) {
                                  return Column(
                                    children: [
                                      Row(
                                        children: [
                                          Expanded(child: _buildQuickStat('Total Users', _host!.totalUsers?.toString() ?? '0', Icons.people)),
                                          const SizedBox(width: 12),
                                          Expanded(child: _buildQuickStat('Active Users', _host!.activeUsers?.toString() ?? '0', Icons.person)),
                                        ],
                                      ),
                                      const SizedBox(height: 12),
                                      Row(
                                        children: [
                                          Expanded(child: _buildQuickStat('Total Calls', _host!.totalCalls?.toString() ?? '0', Icons.call)),
                                          const SizedBox(width: 12),
                                          Expanded(child: _buildQuickStat('Sessions', _sessions.length.toString(), Icons.devices)),
                                        ],
                                      ),
                                    ],
                                  );
                                }
                                return Row(
                                  children: [
                                    Expanded(child: _buildQuickStat('Total Users', _host!.totalUsers?.toString() ?? '0', Icons.people)),
                                    const SizedBox(width: 16),
                                    Expanded(child: _buildQuickStat('Active Users', _host!.activeUsers?.toString() ?? '0', Icons.person)),
                                    const SizedBox(width: 16),
                                    Expanded(child: _buildQuickStat('Total Calls', _host!.totalCalls?.toString() ?? '0', Icons.call)),
                                    const SizedBox(width: 16),
                                    Expanded(child: _buildQuickStat('Active Sessions', _sessions.length.toString(), Icons.devices)),
                                  ],
                                );
                              },
                            ),
                            const SizedBox(height: 24),

                            // Tabs (Responsive)
                            LayoutBuilder(
                              builder: (context, constraints) {
                                final isMobile = constraints.maxWidth < 600;
                                
                                return DefaultTabController(
                                  length: 3,
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Expanded(
                                            child: TabBar(
                                              labelColor: AppTheme.primaryBlue,
                                              unselectedLabelColor: theme.textTheme.bodySmall?.color,
                                              indicatorColor: AppTheme.primaryBlue,
                                              labelStyle: TextStyle(
                                                fontSize: isMobile ? 13 : 14,
                                                fontWeight: FontWeight.w600,
                                              ),
                                              isScrollable: isMobile,
                                              tabs: const [
                                                Tab(text: 'Users'),
                                                Tab(text: 'Call History'),
                                                Tab(text: 'Sessions'),
                                              ],
                                            ),
                                          ),
                                          if (!isMobile)
                                            Padding(
                                              padding: const EdgeInsets.only(left: 16),
                                              child: OutlinedButton.icon(
                                                onPressed: _exportCallHistory,
                                                icon: const Icon(Icons.download, size: 18),
                                                label: const Text('Export Calls'),
                                              ),
                                            ),
                                        ],
                                      ),
                                      SizedBox(height: isMobile ? 12 : 20),
                                      SizedBox(
                                        height: isMobile ? 300 : 400,
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
                                );
                              },
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
    final isMobile = MediaQuery.of(context).size.width < 800;
    
    return Card(
      child: Padding(
        padding: EdgeInsets.all(isMobile ? 16 : 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Host Information',
              style: theme.textTheme.titleLarge,
            ),
            const SizedBox(height: 20),
            isMobile
              ? Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Avatar centered on mobile
                    Center(
                      child: Container(
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
                    ),
                    const SizedBox(height: 20),
                    _buildDetailRow('Display Name', _host!.displayName ?? 'Not set'),
                    const SizedBox(height: 12),
                    _buildDetailRow('Email', _host!.email ?? 'Not set'),
                    const SizedBox(height: 12),
                    _buildDetailRow('Host ID', _host!.id),
                    const SizedBox(height: 12),
                    _buildDetailRow('Status', _host!.statusText, 
                      valueColor: _host!.enabled ? AppTheme.successGreen : AppTheme.dangerRed),
                    const SizedBox(height: 12),
                    _buildDetailRow('2FA', _host!.twoFactorStatus,
                      valueColor: _host!.twoFactorEnabled ? AppTheme.successGreen : null),
                    const SizedBox(height: 12),
                    _buildDetailRow('Multiple Sessions', 
                      _host!.allowMultipleSessions == true ? 'Allowed' : 'Not Allowed'),
                  ],
                )
              : Row(
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

  Widget _buildSubscriptionCard() {
    final theme = Theme.of(context);
    final isMobile = MediaQuery.of(context).size.width < 800;
    
    final membershipType = _host!.membershipType ?? 'Free';
    final startDate = _host!.membershipStartDate;
    final endDate = _host!.membershipEndDate;
    final isActive = _host!.isSubscriptionActive;
    
    Color planColor;
    IconData planIcon;
    
    switch (membershipType) {
      case 'Premium':
        planColor = AppTheme.primaryBlue;
        planIcon = Icons.star;
        break;
      case 'Enterprise':
        planColor = const Color(0xFF9333EA); // Purple
        planIcon = Icons.workspace_premium;
        break;
      default:
        planColor = AppTheme.secondaryBlue;
        planIcon = Icons.card_membership;
    }

    return Card(
      child: Padding(
        padding: EdgeInsets.all(isMobile ? 16 : 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Subscription Details',
                  style: theme.textTheme.titleLarge,
                ),
                IconButton(
                  onPressed: () => _showSubscriptionDialog(),
                  icon: const Icon(Icons.edit, size: 20),
                  tooltip: 'Manage Subscription',
                  color: AppTheme.primaryBlue,
                ),
              ],
            ),
            const SizedBox(height: 20),
            
            // Plan Badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                gradient: membershipType != 'Free'
                    ? LinearGradient(
                        colors: [planColor, planColor.withOpacity(0.7)],
                      )
                    : null,
                color: membershipType == 'Free' 
                    ? theme.brightness == Brightness.dark
                        ? AppTheme.darkCard
                        : AppTheme.lightCard
                    : null,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: membershipType != 'Free' 
                      ? planColor.withOpacity(0.5)
                      : (theme.brightness == Brightness.dark ? AppTheme.darkBorder : AppTheme.lightBorder),
                  width: 2,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    planIcon,
                    color: membershipType != 'Free' ? Colors.white : theme.textTheme.bodyMedium?.color,
                    size: 24,
                  ),
                  const SizedBox(width: 12),
                  Text(
                    membershipType.toUpperCase(),
                    style: TextStyle(
                      color: membershipType != 'Free' ? Colors.white : theme.textTheme.bodyMedium?.color,
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.2,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Subscription Info Grid
            isMobile
                ? Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (startDate != null) ...[
                        _buildDetailRow('Start Date', DateFormat('MMM dd, yyyy').format(startDate)),
                        const SizedBox(height: 12),
                      ],
                      if (endDate != null) ...[
                        _buildDetailRow(
                          'End Date', 
                          DateFormat('MMM dd, yyyy').format(endDate),
                          valueColor: isActive ? null : AppTheme.dangerRed,
                        ),
                        const SizedBox(height: 12),
                      ],
                      _buildDetailRow(
                        'Status',
                        isActive ? 'Active' : 'Expired',
                        valueColor: isActive ? AppTheme.successGreen : AppTheme.dangerRed,
                      ),
                      if (endDate != null && isActive) ...[
                        const SizedBox(height: 12),
                        _buildDetailRow(
                          'Days Remaining',
                          endDate.difference(DateTime.now()).inDays.toString(),
                        ),
                      ],
                    ],
                  )
                : Row(
                    children: [
                      if (startDate != null)
                        Expanded(
                          child: _buildDetailRow('Start Date', DateFormat('MMM dd, yyyy').format(startDate)),
                        ),
                      if (endDate != null)
                        Expanded(
                          child: _buildDetailRow(
                            'End Date', 
                            DateFormat('MMM dd, yyyy').format(endDate),
                            valueColor: isActive ? null : AppTheme.dangerRed,
                          ),
                        ),
                      Expanded(
                        child: _buildDetailRow(
                          'Status',
                          isActive ? 'Active' : 'Expired',
                          valueColor: isActive ? AppTheme.successGreen : AppTheme.dangerRed,
                        ),
                      ),
                      if (endDate != null && isActive)
                        Expanded(
                          child: _buildDetailRow(
                            'Days Remaining',
                            endDate.difference(DateTime.now()).inDays.toString(),
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

  List<PopupMenuEntry<String>> _buildActionMenuItems() {
    return [
      const PopupMenuItem(
        value: 'edit',
        child: Row(
          children: [
            Icon(Icons.edit, size: 18),
            SizedBox(width: 8),
            Text('Edit Host'),
          ],
        ),
      ),
      const PopupMenuItem(
        value: 'reset_password',
        child: Row(
          children: [
            Icon(Icons.lock_reset, size: 18),
            SizedBox(width: 8),
            Text('Reset Password'),
          ],
        ),
      ),
      PopupMenuItem(
        value: 'toggle_status',
        child: Row(
          children: [
            Icon(
              _host?.enabled == true ? Icons.block : Icons.check_circle,
              size: 18,
            ),
            const SizedBox(width: 8),
            Text(_host?.enabled == true ? 'Disable Host' : 'Enable Host'),
          ],
        ),
      ),
      const PopupMenuItem(
        value: 'subscription',
        child: Row(
          children: [
            Icon(Icons.card_membership, size: 18),
            SizedBox(width: 8),
            Text('Manage Subscription'),
          ],
        ),
      ),
      const PopupMenuDivider(),
      const PopupMenuItem(
        value: 'delete',
        child: Row(
          children: [
            Icon(Icons.delete, size: 18, color: AppTheme.dangerRed),
            SizedBox(width: 8),
            Text('Delete Host', style: TextStyle(color: AppTheme.dangerRed)),
          ],
        ),
      ),
    ];
  }

  void _handleAction(String action) {
    switch (action) {
      case 'edit':
        _showEditHostDialog();
        break;
      case 'reset_password':
        _showResetPasswordDialog();
        break;
      case 'toggle_status':
        _toggleHostStatus();
        break;
      case 'subscription':
        _showSubscriptionDialog();
        break;
      case 'delete':
        _showDeleteConfirmation();
        break;
    }
  }

  Future<void> _showEditHostDialog() async {
    final displayNameController = TextEditingController(text: _host?.displayName ?? '');
    final emailController = TextEditingController(text: _host?.email ?? '');

    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Edit Host'),
        content: SizedBox(
          width: 400,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: displayNameController,
                decoration: const InputDecoration(
                  labelText: 'Display Name',
                  hintText: 'Enter display name',
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: emailController,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  hintText: 'Enter email',
                ),
                keyboardType: TextInputType.emailAddress,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Save'),
          ),
        ],
      ),
    );

    if (result == true && mounted) {
      try {
        final hostService = context.read<HostService>();
        await hostService.updateHost(
          hostId: widget.hostId,
          displayName: displayNameController.text.trim(),
          email: emailController.text.trim(),
        );

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Host updated successfully')),
          );
          _loadHostDetails();
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error: ${e.toString().replaceFirst('ApiException: ', '')}')),
          );
        }
      }
    }
  }

  Future<void> _showResetPasswordDialog() async {
    final passwordController = TextEditingController();
    final confirmController = TextEditingController();

    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Reset Password'),
        content: SizedBox(
          width: 400,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: passwordController,
                decoration: const InputDecoration(
                  labelText: 'New Password',
                  hintText: 'Enter new password',
                ),
                obscureText: true,
              ),
              const SizedBox(height: 16),
              TextField(
                controller: confirmController,
                decoration: const InputDecoration(
                  labelText: 'Confirm Password',
                  hintText: 'Re-enter password',
                ),
                obscureText: true,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              if (passwordController.text != confirmController.text) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Passwords do not match')),
                );
                return;
              }
              if (passwordController.text.length < 6) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Password must be at least 6 characters')),
                );
                return;
              }
              Navigator.pop(context, true);
            },
            child: const Text('Reset'),
          ),
        ],
      ),
    );

    if (result == true && mounted) {
      try {
        final hostService = context.read<HostService>();
        await hostService.resetPassword(
          hostId: widget.hostId,
          newPassword: passwordController.text,
        );

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Password reset successfully')),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error: ${e.toString().replaceFirst('ApiException: ', '')}')),
          );
        }
      }
    }
  }

  Future<void> _toggleHostStatus() async {
    final newStatus = !(_host?.enabled ?? true);
    final action = newStatus ? 'enable' : 'disable';

    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('${action.substring(0, 1).toUpperCase()}${action.substring(1)} Host'),
        content: Text('Are you sure you want to $action this host?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: newStatus ? AppTheme.successGreen : AppTheme.dangerRed,
            ),
            child: Text(action.substring(0, 1).toUpperCase() + action.substring(1)),
          ),
        ],
      ),
    );

    if (confirm == true && mounted) {
      try {
        final hostService = context.read<HostService>();
        await hostService.updateHost(
          hostId: widget.hostId,
          enabled: newStatus,
        );

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Host ${action}d successfully')),
          );
          _loadHostDetails();
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error: ${e.toString().replaceFirst('ApiException: ', '')}')),
          );
        }
      }
    }
  }

  Future<void> _showSubscriptionDialog() async {
    String selectedType = _host?.membershipType ?? 'Free';
    DateTime? selectedEndDate = _host?.membershipEndDate;

    final result = await showDialog<Map<String, dynamic>?>(
      context: context,
      builder: (context) => StatefulBuilder(
                                  builder: (context, setDialogState) => AlertDialog(
          title: const Text('Manage Subscription'),
          content: SizedBox(
            width: 400,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Membership Type', style: TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  value: selectedType,
                  decoration: const InputDecoration(
                    border: OutlineInputBorder(),
                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'Free', child: Text('Free')),
                    DropdownMenuItem(value: 'Premium', child: Text('Premium')),
                    DropdownMenuItem(value: 'Enterprise', child: Text('Enterprise')),
                  ],
                  onChanged: (value) {
                    setDialogState(() => selectedType = value ?? 'Free');
                  },
                ),
                const SizedBox(height: 16),
                const Text('End Date', style: TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: () async {
                    final date = await showDatePicker(
                      context: context,
                      initialDate: selectedEndDate ?? DateTime.now().add(const Duration(days: 365)),
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 3650)),
                    );
                    if (date != null) {
                      setDialogState(() => selectedEndDate = date);
                    }
                  },
                  icon: const Icon(Icons.calendar_today),
                  label: Text(
                    selectedEndDate != null
                        ? DateFormat('MMM dd, yyyy').format(selectedEndDate!)
                        : 'Select date',
                  ),
                ),
                const SizedBox(height: 20),
                const Divider(),
                const SizedBox(height: 12),
                const Text('Quick Actions', style: TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => Navigator.pop(context, {'action': 'renew'}),
                        icon: const Icon(Icons.autorenew, size: 18),
                        label: const Text('Renew (1 Year)'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppTheme.successGreen,
                          side: const BorderSide(color: AppTheme.successGreen),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => Navigator.pop(context, {'action': 'end'}),
                        icon: const Icon(Icons.cancel, size: 18),
                        label: const Text('End Now'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppTheme.dangerRed,
                          side: const BorderSide(color: AppTheme.dangerRed),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(context, {
                'membershipType': selectedType,
                'membershipEndDate': selectedEndDate,
              }),
              child: const Text('Update'),
            ),
          ],
        ),
      ),
    );

    if (result != null && mounted) {
      try {
        final hostService = context.read<HostService>();
        await hostService.updateSubscription(
          hostId: widget.hostId,
          membershipType: result['membershipType'],
          membershipEndDate: result['membershipEndDate'],
          action: result['action'],
        );

        if (mounted) {
          final action = result['action'];
          final message = action == 'renew'
              ? 'Subscription renewed for 1 year'
              : action == 'end'
                  ? 'Subscription ended'
                  : 'Subscription updated successfully';
          
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(message)),
          );
          _loadHostDetails();
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error: ${e.toString().replaceFirst('ApiException: ', '')}')),
          );
        }
      }
    }
  }

  Future<void> _showDeleteConfirmation() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Host'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Are you sure you want to delete this host?'),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.dangerRed.withOpacity(0.1),
                border: Border.all(color: AppTheme.dangerRed),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Row(
                children: [
                  Icon(Icons.warning, color: AppTheme.dangerRed, size: 20),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'This will delete all users, calls, and data associated with this host.',
                      style: TextStyle(fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.dangerRed,
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirm == true && mounted) {
      try {
        final hostService = context.read<HostService>();
        await hostService.deleteHost(widget.hostId);

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Host deleted successfully')),
          );
          context.go('/hosts');
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error: ${e.toString().replaceFirst('ApiException: ', '')}')),
          );
        }
      }
    }
  }

  Future<void> _exportCallHistory() async {
    try {
      final exportService = context.read<ExportService>();
      final callsData = _calls.map((call) => Map<String, dynamic>.from(call)).toList();
      final path = await exportService.exportCallsToCSV(callsData);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Exported to: $path'),
            duration: const Duration(seconds: 5),
            action: SnackBarAction(
              label: 'OK',
              onPressed: () {},
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Export failed: ${e.toString()}')),
        );
      }
    }
  }
}
