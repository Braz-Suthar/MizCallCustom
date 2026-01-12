import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../config/theme.dart';
import '../config/app_config.dart';
import '../models/host.dart';
import '../services/api_service.dart';

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
                            padding: const EdgeInsets.all(32),
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

    return Card(
      child: InkWell(
        onTap: () => context.go('/hosts/${host.id}'),
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              // Avatar
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppTheme.primaryBlue, Color(0xFF2563EB)],
                  ),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: host.avatarUrl != null
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(14),
                        child: Image.network(
                          host.avatarUrl!.startsWith('http')
                              ? host.avatarUrl!
                              : '${AppConfig.apiBaseUrl}${host.avatarUrl}',
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) {
                            return Center(
                              child: Text(
                                host.name[0].toUpperCase(),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 24,
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
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
              ),
              const SizedBox(width: 20),

              // Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          host.displayLabel,
                          style: theme.textTheme.titleLarge,
                        ),
                        const SizedBox(width: 12),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: host.enabled
                                ? AppTheme.successGreen.withOpacity(0.1)
                                : AppTheme.dangerRed.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            host.statusText,
                            style: TextStyle(
                              color: host.enabled
                                  ? AppTheme.successGreen
                                  : AppTheme.dangerRed,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        _buildInfoChip(Icons.tag, host.id),
                        const SizedBox(width: 12),
                        if (host.email != null)
                          _buildInfoChip(Icons.email, host.email!),
                      ],
                    ),
                  ],
                ),
              ),

              // Stats
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
}
