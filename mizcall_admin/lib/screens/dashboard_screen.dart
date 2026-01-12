import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fl_chart/fl_chart.dart';

import '../config/theme.dart';
import '../config/app_config.dart';
import '../models/dashboard_stats.dart';
import '../services/api_service.dart';
import '../widgets/stat_card.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  DashboardStats? _stats;

  @override
  void initState() {
    super.initState();
    _loadStats();
  }

  Future<void> _loadStats() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final apiService = context.read<ApiService>();
      final response = await apiService.get(AppConfig.dashboardStatsEndpoint);
      
      setState(() {
        _stats = DashboardStats.fromJson(response);
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
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Dashboard',
                                  style: theme.textTheme.headlineMedium?.copyWith(
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'System overview',
                                  style: theme.textTheme.bodySmall,
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            onPressed: _loadStats,
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
                          'Dashboard',
                          style: theme.textTheme.displaySmall?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'System overview and statistics',
                          style: theme.textTheme.bodySmall,
                        ),
                      ],
                    ),
                    ElevatedButton.icon(
                      onPressed: _loadStats,
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
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 20,
                          vertical: 14,
                        ),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),

          // Content
          Expanded(
            child: _isLoading && _stats == null
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
                            Text(
                              'Failed to load stats',
                              style: theme.textTheme.titleLarge,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              _errorMessage!,
                              style: theme.textTheme.bodySmall,
                            ),
                            const SizedBox(height: 24),
                            ElevatedButton.icon(
                              onPressed: _loadStats,
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
                            // Stats Grid (Responsive)
                            LayoutBuilder(
                              builder: (context, constraints) {
                                final width = constraints.maxWidth;
                                int crossAxisCount;
                                double childAspectRatio;
                                
                                if (width < 600) {
                                  crossAxisCount = 1;
                                  childAspectRatio = 2.5;
                                } else if (width < 900) {
                                  crossAxisCount = 2;
                                  childAspectRatio = 2.0;
                                } else if (width < 1200) {
                                  crossAxisCount = 3;
                                  childAspectRatio = 1.8;
                                } else {
                                  crossAxisCount = 4;
                                  childAspectRatio = 1.8;
                                }
                                
                                return GridView.count(
                                  crossAxisCount: crossAxisCount,
                                  crossAxisSpacing: width < 600 ? 12 : 20,
                                  mainAxisSpacing: width < 600 ? 12 : 20,
                                  shrinkWrap: true,
                                  physics: const NeverScrollableScrollPhysics(),
                                  childAspectRatio: childAspectRatio,
                                  children: [
                                    StatCard(
                                      title: 'Total Hosts',
                                      value: _stats!.totalHosts.toString(),
                                      icon: Icons.people,
                                      color: AppTheme.primaryBlue,
                                      subtitle: '${_stats!.activeHosts} active',
                                    ),
                                    StatCard(
                                      title: 'Total Users',
                                      value: _stats!.totalUsers.toString(),
                                      icon: Icons.person,
                                      color: AppTheme.secondaryBlue,
                                      subtitle: '${_stats!.activeUsers} active',
                                    ),
                                    StatCard(
                                      title: 'Total Calls',
                                      value: _stats!.totalCalls.toString(),
                                      icon: Icons.call,
                                      color: AppTheme.successGreen,
                                      subtitle: '${_stats!.activeCalls} active now',
                                    ),
                                    StatCard(
                                      title: 'Recordings',
                                      value: _stats!.totalRecordings.toString(),
                                      icon: Icons.mic,
                                      color: AppTheme.warningOrange,
                                      subtitle: _stats!.storageUsed,
                                    ),
                                  ],
                                );
                              },
                            ),

                            const SizedBox(height: 32),

                            // System Status
                            Text(
                              'System Status',
                              style: theme.textTheme.headlineMedium,
                            ),
                            const SizedBox(height: 16),

                            // Responsive System Status Cards
                            LayoutBuilder(
                              builder: (context, constraints) {
                                if (constraints.maxWidth < 800) {
                                  // Mobile: Stack vertically
                                  return Column(
                                    children: [
                                      _buildStatusCard(
                                        'Backend API',
                                        _stats!.serverStatus,
                                        Icons.dns,
                                      ),
                                      const SizedBox(height: 12),
                                      _buildStatusCard(
                                        'Mediasoup',
                                        _stats!.mediasoupStatus,
                                        Icons.videocam,
                                      ),
                                      const SizedBox(height: 12),
                                      _buildStatusCard(
                                        'Database',
                                        _stats!.databaseStatus,
                                        Icons.storage,
                                      ),
                                    ],
                                  );
                                } else {
                                  // Desktop: Row
                                  return Row(
                                    children: [
                                      Expanded(
                                        child: _buildStatusCard(
                                          'Backend API',
                                          _stats!.serverStatus,
                                          Icons.dns,
                                        ),
                                      ),
                                      const SizedBox(width: 16),
                                      Expanded(
                                        child: _buildStatusCard(
                                          'Mediasoup',
                                          _stats!.mediasoupStatus,
                                          Icons.videocam,
                                        ),
                                      ),
                                      const SizedBox(width: 16),
                                      Expanded(
                                        child: _buildStatusCard(
                                          'Database',
                                          _stats!.databaseStatus,
                                          Icons.storage,
                                        ),
                                      ),
                                    ],
                                  );
                                }
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

  Widget _buildStatusCard(String title, String status, IconData icon) {
    final theme = Theme.of(context);
    final isOnline = status.toLowerCase() == 'online' || 
                     status.toLowerCase() == 'connected' ||
                     status.toLowerCase() == 'active';
    final color = isOnline ? AppTheme.successGreen : AppTheme.dangerRed;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color, size: 24),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: theme.textTheme.bodySmall,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: color,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        status,
                        style: theme.textTheme.titleMedium?.copyWith(
                          color: color,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
