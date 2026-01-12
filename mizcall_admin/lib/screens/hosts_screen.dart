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

class HostsScreen extends StatefulWidget {
  const HostsScreen({super.key});

  @override
  State<HostsScreen> createState() => _HostsScreenState();
}

class _HostsScreenState extends State<HostsScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  List<Host> _hosts = [];
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _loadHosts();
  }

  Future<void> _loadHosts() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final apiService = context.read<ApiService>();
      final response = await apiService.get(AppConfig.hostsEndpoint);
      
      setState(() {
        _hosts = (response['hosts'] as List)
            .map((json) => Host.fromJson(json))
            .toList();
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceFirst('ApiException: ', '');
        _isLoading = false;
      });
    }
  }

  List<Host> get _filteredHosts {
    if (_searchQuery.isEmpty) return _hosts;
    
    final query = _searchQuery.toLowerCase();
    return _hosts.where((host) {
      return host.id.toLowerCase().contains(query) ||
          host.name.toLowerCase().contains(query) ||
          (host.email?.toLowerCase().contains(query) ?? false) ||
          (host.displayName?.toLowerCase().contains(query) ?? false);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final filteredHosts = _filteredHosts;

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
                final isMobile = constraints.maxWidth < 800;
                
                if (isMobile) {
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Hosts',
                                  style: theme.textTheme.headlineMedium?.copyWith(
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '${_hosts.length} total',
                                  style: theme.textTheme.bodySmall,
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            onPressed: _exportHosts,
                            icon: const Icon(Icons.download),
                            tooltip: 'Export',
                          ),
                          IconButton(
                            onPressed: _showCreateHostDialog,
                            icon: const Icon(Icons.add),
                            tooltip: 'Create Host',
                          ),
                          IconButton(
                            onPressed: _loadHosts,
                            icon: _isLoading
                                ? const SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  )
                                : const Icon(Icons.refresh),
                            tooltip: 'Refresh',
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        decoration: const InputDecoration(
                          hintText: 'Search hosts...',
                          prefixIcon: Icon(Icons.search, size: 20),
                          contentPadding: EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 12,
                          ),
                        ),
                        onChanged: (value) {
                          setState(() => _searchQuery = value);
                        },
                      ),
                    ],
                  );
                }
                
                return Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Hosts',
                          style: theme.textTheme.displaySmall?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${_hosts.length} total hosts',
                          style: theme.textTheme.bodySmall,
                        ),
                      ],
                    ),
                    Row(
                      children: [
                        SizedBox(
                          width: 300,
                          child: TextField(
                            decoration: const InputDecoration(
                              hintText: 'Search hosts...',
                              prefixIcon: Icon(Icons.search, size: 20),
                              contentPadding: EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 12,
                              ),
                            ),
                            onChanged: (value) {
                              setState(() => _searchQuery = value);
                            },
                          ),
                        ),
                        const SizedBox(width: 12),
                        OutlinedButton.icon(
                          onPressed: _exportHosts,
                          icon: const Icon(Icons.download, size: 20),
                          label: const Text('Export'),
                        ),
                        const SizedBox(width: 12),
                        ElevatedButton.icon(
                          onPressed: _showCreateHostDialog,
                          icon: const Icon(Icons.add, size: 20),
                          label: const Text('Create Host'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.successGreen,
                          ),
                        ),
                        const SizedBox(width: 12),
                        ElevatedButton.icon(
                          onPressed: _loadHosts,
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
                  ],
                );
              },
            ),
          ),

          // Content
          Expanded(
            child: _isLoading && _hosts.isEmpty
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
                            Text('Failed to load hosts', style: theme.textTheme.titleLarge),
                            const SizedBox(height: 8),
                            Text(_errorMessage!, style: theme.textTheme.bodySmall),
                            const SizedBox(height: 24),
                            ElevatedButton.icon(
                              onPressed: _loadHosts,
                              icon: const Icon(Icons.refresh),
                              label: const Text('Retry'),
                            ),
                          ],
                        ),
                      )
                    : filteredHosts.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.search_off,
                                  size: 64,
                                  color: theme.textTheme.bodySmall?.color,
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  _searchQuery.isEmpty ? 'No hosts found' : 'No matching hosts',
                                  style: theme.textTheme.titleLarge,
                                ),
                              ],
                            ),
                          )
                        : ListView.separated(
                            padding: EdgeInsets.all(MediaQuery.of(context).size.width < 800 ? 16 : 32),
                            itemCount: filteredHosts.length,
                            separatorBuilder: (context, index) => const SizedBox(height: 12),
                            itemBuilder: (context, index) {
                              final host = filteredHosts[index];
                              return _buildHostCard(host);
                            },
                          ),
          ),
        ],
      ),
    );
  }

  Widget _buildHostCard(Host host) {
    final theme = Theme.of(context);
    final isMobile = MediaQuery.of(context).size.width < 800;
    final avatarSize = isMobile ? 48.0 : 56.0;
    final avatarFontSize = isMobile ? 20.0 : 24.0;

    return Card(
      child: InkWell(
        onTap: () => context.go('/hosts/${host.id}'),
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: EdgeInsets.all(isMobile ? 12 : 20),
          child: Row(
            children: [
              // Avatar
              Container(
                width: avatarSize,
                height: avatarSize,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppTheme.primaryBlue, Color(0xFF2563EB)],
                  ),
                  borderRadius: BorderRadius.circular(isMobile ? 12 : 14),
                ),
                child: host.avatarUrl != null
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(isMobile ? 12 : 14),
                        child: Image.network(
                          host.avatarUrl!.startsWith('http')
                              ? host.avatarUrl!
                              : '${AppConfig.apiBaseUrl}${host.avatarUrl}',
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) {
                            return Center(
                              child: Text(
                                host.name[0].toUpperCase(),
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: avatarFontSize,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            );
                          },
                        ),
                      )
                    : Center(
                        child: Text(
                          host.name[0].toUpperCase(),
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: avatarFontSize,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
              ),
              SizedBox(width: isMobile ? 12 : 20),

              // Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      spacing: 8,
                      runSpacing: 4,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        Text(
                          host.displayLabel,
                          style: theme.textTheme.titleLarge?.copyWith(
                            fontSize: isMobile ? 16 : null,
                          ),
                          overflow: TextOverflow.ellipsis,
                          maxLines: 1,
                        ),
                        Container(
                          padding: EdgeInsets.symmetric(
                            horizontal: isMobile ? 6 : 8,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: host.enabled
                                ? AppTheme.successGreen.withOpacity(0.1)
                                : AppTheme.dangerRed.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            host.statusText,
                            style: TextStyle(
                              color: host.enabled
                                  ? AppTheme.successGreen
                                  : AppTheme.dangerRed,
                              fontSize: isMobile ? 10 : 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        if (host.membershipType != null && host.membershipType != 'Free')
                          Container(
                            padding: EdgeInsets.symmetric(
                              horizontal: isMobile ? 6 : 8,
                              vertical: 3,
                            ),
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [AppTheme.primaryBlue, Color(0xFF2563EB)],
                              ),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.star, size: 12, color: Colors.white),
                                const SizedBox(width: 4),
                                Text(
                                  host.membershipType!,
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: isMobile ? 10 : 12,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 12,
                      runSpacing: 4,
                      children: [
                        _buildInfoChip(Icons.tag, host.id),
                        if (host.email != null && !isMobile)
                          _buildInfoChip(Icons.email, host.email!),
                      ],
                    ),
                  ],
                ),
              ),

              // Stats
              if (!isMobile)
                Row(
                  children: [
                    _buildStatBadge('Users', host.totalUsers?.toString() ?? '0'),
                    const SizedBox(width: 16),
                    _buildStatBadge('Calls', host.totalCalls?.toString() ?? '0'),
                    const SizedBox(width: 16),
                    Icon(
                      Icons.chevron_right,
                      color: theme.textTheme.bodySmall?.color,
                    ),
                  ],
                )
              else
                Icon(
                  Icons.chevron_right,
                  color: theme.textTheme.bodySmall?.color,
                  size: 20,
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoChip(IconData icon, String text) {
    final theme = Theme.of(context);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: theme.textTheme.bodySmall?.color),
        const SizedBox(width: 4),
        Text(
          text,
          style: theme.textTheme.bodySmall?.copyWith(fontSize: 13),
        ),
      ],
    );
  }

  Widget _buildStatBadge(String label, String value) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Text(
          value,
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w700,
            color: AppTheme.primaryBlue,
          ),
        ),
        Text(
          label,
          style: theme.textTheme.bodySmall?.copyWith(fontSize: 11),
        ),
      ],
    );
  }

  Future<void> _showCreateHostDialog() async {
    final emailController = TextEditingController();
    final passwordController = TextEditingController();
    final confirmPasswordController = TextEditingController();
    final displayNameController = TextEditingController();
    String membershipType = 'Free';
    DateTime? membershipEndDate;

    final result = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Create New Host'),
          content: SingleChildScrollView(
            child: SizedBox(
              width: 500,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextField(
                    controller: emailController,
                    decoration: const InputDecoration(
                      labelText: 'Email *',
                      hintText: 'host@example.com',
                      prefixIcon: Icon(Icons.email),
                    ),
                    keyboardType: TextInputType.emailAddress,
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: displayNameController,
                    decoration: const InputDecoration(
                      labelText: 'Display Name',
                      hintText: 'Host Name',
                      prefixIcon: Icon(Icons.person),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: passwordController,
                    decoration: const InputDecoration(
                      labelText: 'Password *',
                      hintText: 'Minimum 6 characters',
                      prefixIcon: Icon(Icons.lock),
                    ),
                    obscureText: true,
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: confirmPasswordController,
                    decoration: const InputDecoration(
                      labelText: 'Confirm Password *',
                      hintText: 'Re-enter password',
                      prefixIcon: Icon(Icons.lock_outline),
                    ),
                    obscureText: true,
                  ),
                  const SizedBox(height: 20),
                  const Text('Membership', style: TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    value: membershipType,
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
                      setState(() => membershipType = value ?? 'Free');
                    },
                  ),
                  if (membershipType != 'Free') ...[
                    const SizedBox(height: 16),
                    OutlinedButton.icon(
                      onPressed: () async {
                        final date = await showDatePicker(
                          context: context,
                          initialDate: DateTime.now().add(const Duration(days: 365)),
                          firstDate: DateTime.now(),
                          lastDate: DateTime.now().add(const Duration(days: 3650)),
                        );
                        if (date != null) {
                          setState(() => membershipEndDate = date);
                        }
                      },
                      icon: const Icon(Icons.calendar_today, size: 18),
                      label: Text(
                        membershipEndDate != null
                            ? 'Expires: ${DateFormat('MMM dd, yyyy').format(membershipEndDate!)}'
                            : 'Set expiry date (1 year default)',
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () {
                if (emailController.text.trim().isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Email is required')),
                  );
                  return;
                }
                if (passwordController.text.length < 6) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Password must be at least 6 characters')),
                  );
                  return;
                }
                if (passwordController.text != confirmPasswordController.text) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Passwords do not match')),
                  );
                  return;
                }
                Navigator.pop(context, true);
              },
              child: const Text('Create Host'),
            ),
          ],
        ),
      ),
    );

    if (result == true && mounted) {
      try {
        final hostService = context.read<HostService>();
        await hostService.createHost(
          email: emailController.text.trim(),
          password: passwordController.text,
          displayName: displayNameController.text.trim().isNotEmpty 
              ? displayNameController.text.trim() 
              : null,
          membershipType: membershipType,
          membershipEndDate: membershipEndDate,
        );

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Host created successfully')),
          );
          _loadHosts();
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

  Future<void> _exportHosts() async {
    try {
      final exportService = context.read<ExportService>();
      final hostsData = _hosts.map((host) => {
        'id': host.id,
        'name': host.name,
        'displayName': host.displayName,
        'email': host.email,
        'enabled': host.enabled,
        'membershipType': host.membershipType,
        'totalUsers': host.totalUsers,
        'totalCalls': host.totalCalls,
        'createdAt': host.createdAt?.toIso8601String() ?? '',
      }).toList();

      final path = await exportService.exportHostsToCSV(hostsData);

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
