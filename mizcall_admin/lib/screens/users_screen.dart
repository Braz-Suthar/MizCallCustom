import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../config/theme.dart';
import '../config/app_config.dart';
import '../services/api_service.dart';
import '../services/export_service.dart';

class UsersScreen extends StatefulWidget {
  const UsersScreen({super.key});

  @override
  State<UsersScreen> createState() => _UsersScreenState();
}

class _UsersScreenState extends State<UsersScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  List<Map<String, dynamic>> _users = [];
  String _searchQuery = '';
  String? _filterHost;
  bool? _filterEnabled;

  @override
  void initState() {
    super.initState();
    _loadUsers();
  }

  Future<void> _loadUsers() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final apiService = context.read<ApiService>();
      final response = await apiService.get('/admin/users');
      
      setState(() {
        _users = List<Map<String, dynamic>>.from(response['users']);
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceFirst('ApiException: ', '');
        _isLoading = false;
      });
    }
  }

  List<Map<String, dynamic>> get _filteredUsers {
    var filtered = _users;
    
    if (_searchQuery.isNotEmpty) {
      final query = _searchQuery.toLowerCase();
      filtered = filtered.where((user) {
        return (user['username']?.toLowerCase().contains(query) ?? false) ||
            (user['id']?.toLowerCase().contains(query) ?? false) ||
            (user['host_id']?.toLowerCase().contains(query) ?? false);
      }).toList();
    }
    
    if (_filterHost != null) {
      filtered = filtered.where((user) => user['host_id'] == _filterHost).toList();
    }
    
    if (_filterEnabled != null) {
      filtered = filtered.where((user) => (user['enabled'] ?? false) == _filterEnabled).toList();
    }
    
    return filtered;
  }

  Set<String> get _hostIds {
    return _users.map((u) => u['host_id'] as String? ?? '').where((id) => id.isNotEmpty).toSet();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final filteredUsers = _filteredUsers;
    final isMobile = MediaQuery.of(context).size.width < 800;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Container(
            padding: EdgeInsets.all(isMobile ? 16 : 32),
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
                if (constraints.maxWidth < 800) {
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
                                  'Users',
                                  style: theme.textTheme.headlineMedium?.copyWith(
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '${_users.length} total',
                                  style: theme.textTheme.bodySmall,
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            onPressed: _exportUsers,
                            icon: const Icon(Icons.download),
                            tooltip: 'Export',
                          ),
                          IconButton(
                            onPressed: _loadUsers,
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
                      const SizedBox(height: 12),
                      TextField(
                        decoration: const InputDecoration(
                          hintText: 'Search users...',
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
                          'Users',
                          style: theme.textTheme.displaySmall?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${_users.length} total users across all hosts',
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
                              hintText: 'Search users...',
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
                          onPressed: _exportUsers,
                          icon: const Icon(Icons.download, size: 20),
                          label: const Text('Export'),
                        ),
                        const SizedBox(width: 12),
                        ElevatedButton.icon(
                          onPressed: _loadUsers,
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

          // Filters
          if (!isMobile)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
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
                  const Text('Filters:', style: TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(width: 16),
                  DropdownButton<String?>(
                    value: _filterHost,
                    hint: const Text('All Hosts'),
                    items: [
                      const DropdownMenuItem(value: null, child: Text('All Hosts')),
                      ..._hostIds.map((hostId) {
                        return DropdownMenuItem(
                          value: hostId,
                          child: Text(hostId),
                        );
                      }),
                    ],
                    onChanged: (value) {
                      setState(() => _filterHost = value);
                    },
                  ),
                  const SizedBox(width: 20),
                  DropdownButton<bool?>(
                    value: _filterEnabled,
                    hint: const Text('All Status'),
                    items: const [
                      DropdownMenuItem(value: null, child: Text('All Status')),
                      DropdownMenuItem(value: true, child: Text('Active')),
                      DropdownMenuItem(value: false, child: Text('Disabled')),
                    ],
                    onChanged: (value) {
                      setState(() => _filterEnabled = value);
                    },
                  ),
                  const SizedBox(width: 20),
                  if (_filterHost != null || _filterEnabled != null)
                    TextButton.icon(
                      onPressed: () {
                        setState(() {
                          _filterHost = null;
                          _filterEnabled = null;
                        });
                      },
                      icon: const Icon(Icons.clear, size: 18),
                      label: const Text('Clear Filters'),
                    ),
                ],
              ),
            ),

          // Content
          Expanded(
            child: _isLoading && _users.isEmpty
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
                            Text('Failed to load users', style: theme.textTheme.titleLarge),
                            const SizedBox(height: 8),
                            Text(_errorMessage!, style: theme.textTheme.bodySmall),
                            const SizedBox(height: 24),
                            ElevatedButton.icon(
                              onPressed: _loadUsers,
                              icon: const Icon(Icons.refresh),
                              label: const Text('Retry'),
                            ),
                          ],
                        ),
                      )
                    : filteredUsers.isEmpty
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
                                  _searchQuery.isEmpty ? 'No users found' : 'No matching users',
                                  style: theme.textTheme.titleLarge,
                                ),
                              ],
                            ),
                          )
                        : ListView.separated(
                            padding: EdgeInsets.all(isMobile ? 16 : 32),
                            itemCount: filteredUsers.length,
                            separatorBuilder: (context, index) => const SizedBox(height: 12),
                            itemBuilder: (context, index) {
                              final user = filteredUsers[index];
                              return _buildUserCard(user);
                            },
                          ),
          ),
        ],
      ),
    );
  }

  Widget _buildUserCard(Map<String, dynamic> user) {
    final theme = Theme.of(context);
    final isMobile = MediaQuery.of(context).size.width < 800;
    final enabled = user['enabled'] ?? false;
    final username = user['username'] ?? 'Unknown';
    final userId = user['id'] ?? '';
    final hostId = user['host_id'] ?? '';

    return Card(
      child: Padding(
        padding: EdgeInsets.all(isMobile ? 12 : 16),
        child: Row(
          children: [
            // Avatar
            CircleAvatar(
              radius: isMobile ? 20 : 24,
              backgroundColor: enabled 
                  ? AppTheme.primaryBlue 
                  : theme.textTheme.bodySmall?.color?.withOpacity(0.3),
              child: Text(
                username[0].toUpperCase(),
                style: TextStyle(
                  color: Colors.white,
                  fontSize: isMobile ? 16 : 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            SizedBox(width: isMobile ? 12 : 16),

            // Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          username,
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontSize: isMobile ? 15 : null,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: EdgeInsets.symmetric(
                          horizontal: isMobile ? 6 : 8,
                          vertical: 3,
                        ),
                        decoration: BoxDecoration(
                          color: enabled
                              ? AppTheme.successGreen.withOpacity(0.1)
                              : AppTheme.dangerRed.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          enabled ? 'Active' : 'Disabled',
                          style: TextStyle(
                            color: enabled ? AppTheme.successGreen : AppTheme.dangerRed,
                            fontSize: isMobile ? 10 : 11,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Wrap(
                    spacing: 12,
                    runSpacing: 4,
                    children: [
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.tag, size: 12, color: theme.textTheme.bodySmall?.color),
                          const SizedBox(width: 4),
                          Text(
                            userId,
                            style: theme.textTheme.bodySmall?.copyWith(fontSize: 12),
                          ),
                        ],
                      ),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.business, size: 12, color: theme.textTheme.bodySmall?.color),
                          const SizedBox(width: 4),
                          Text(
                            'Host: $hostId',
                            style: theme.textTheme.bodySmall?.copyWith(fontSize: 12),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Actions
            if (!isMobile)
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    icon: Icon(
                      enabled ? Icons.block : Icons.check_circle,
                      size: 20,
                      color: enabled ? AppTheme.dangerRed : AppTheme.successGreen,
                    ),
                    tooltip: enabled ? 'Disable' : 'Enable',
                    onPressed: () => _toggleUserStatus(userId, hostId, !enabled),
                  ),
                  IconButton(
                    icon: const Icon(Icons.lock_reset, size: 20),
                    tooltip: 'Reset Password',
                    onPressed: () => _showResetPasswordDialog(userId, hostId, username),
                  ),
                ],
              )
            else
              PopupMenuButton<String>(
                icon: const Icon(Icons.more_vert, size: 20),
                onSelected: (value) {
                  switch (value) {
                    case 'toggle':
                      _toggleUserStatus(userId, hostId, !enabled);
                      break;
                    case 'reset_password':
                      _showResetPasswordDialog(userId, hostId, username);
                      break;
                  }
                },
                itemBuilder: (context) => [
                  PopupMenuItem(
                    value: 'toggle',
                    child: Row(
                      children: [
                        Icon(
                          enabled ? Icons.block : Icons.check_circle,
                          size: 18,
                          color: enabled ? AppTheme.dangerRed : AppTheme.successGreen,
                        ),
                        const SizedBox(width: 8),
                        Text(enabled ? 'Disable' : 'Enable'),
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
                ],
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _toggleUserStatus(String userId, String hostId, bool newStatus) async {
    try {
      final apiService = context.read<ApiService>();
      await apiService.patch('/admin/users/$hostId/$userId', {
        'enabled': newStatus,
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('User ${newStatus ? 'enabled' : 'disabled'} successfully')),
        );
        _loadUsers();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString().replaceFirst('ApiException: ', '')}')),
        );
      }
    }
  }

  Future<void> _showResetPasswordDialog(String userId, String hostId, String username) async {
    final passwordController = TextEditingController();
    final confirmController = TextEditingController();

    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Reset Password for $username'),
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
        final apiService = context.read<ApiService>();
        await apiService.post('/admin/users/$hostId/$userId/reset-password', {
          'newPassword': passwordController.text,
        });

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

  Future<void> _exportUsers() async {
    try {
      final exportService = context.read<ExportService>();
      final path = await exportService.exportUsersToCSV(_users);

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
