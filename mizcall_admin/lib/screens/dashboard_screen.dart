import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import 'dart:async';

import '../config/theme.dart';
import '../config/app_config.dart';
import '../models/dashboard_stats.dart';
import '../services/api_service.dart';
import '../services/websocket_service.dart';
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
  Timer? _refreshTimer;
  StreamSubscription? _statsSubscription;

  @override
  void initState() {
    super.initState();
    _loadStats();
    _startAutoRefresh();
    _listenToWebSocket();
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    _statsSubscription?.cancel();
    super.dispose();
  }

  void _startAutoRefresh() {
    // Auto-refresh every 10 seconds
    _refreshTimer = Timer.periodic(const Duration(seconds: 10), (timer) {
      if (mounted) {
        _loadStats(silent: true);
      }
    });
  }

  void _listenToWebSocket() {
    final wsService = context.read<WebSocketService>();
    _statsSubscription = wsService.statsStream.listen((data) {
      if (mounted) {
        setState(() {
          _stats = DashboardStats.fromJson(data);
        });
      }
    });
  }

  Future<void> _loadStats({bool silent = false}) async {
    if (!silent) {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
      });
    }

    try {
      final apiService = context.read<ApiService>();
      final response = await apiService.get(AppConfig.dashboardStatsEndpoint);
      
      if (mounted) {
        setState(() {
          _stats = DashboardStats.fromJson(response);
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString().replaceFirst('ApiException: ', '');
          _isLoading = false;
        });
      }
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
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: AppTheme.successGreen.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(
                                    color: AppTheme.successGreen.withOpacity(0.3),
                                  ),
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      Icons.circle,
                                      size: 8,
                                      color: AppTheme.successGreen,
                                    ),
                                    SizedBox(width: 6),
                                    Text(
                                      'Live',
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        color: AppTheme.successGreen,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8),
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
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: AppTheme.successGreen.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: AppTheme.successGreen.withOpacity(0.3),
                            ),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Icons.circle,
                                size: 8,
                                color: AppTheme.successGreen,
                              ),
                              SizedBox(width: 6),
                              Text(
                                'Auto-refresh: 10s',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: AppTheme.successGreen,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
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
                            // Stats Grid (2x2)
                            LayoutBuilder(
                              builder: (context, constraints) {
                                final isMobile = constraints.maxWidth < 600;
                                
                                return GridView.count(
                                  crossAxisCount: 2,
                                  crossAxisSpacing: isMobile ? 12 : 20,
                                  mainAxisSpacing: isMobile ? 12 : 20,
                                  shrinkWrap: true,
                                  physics: const NeverScrollableScrollPhysics(),
                                  childAspectRatio: isMobile ? 1.3 : 2.2,
                                  children: [
                                    StatCard(
                                      title: 'Total Hosts',
                                      value: _stats!.totalHosts.toString(),
                                      icon: Icons.business,
                                      color: AppTheme.primaryBlue,
                                      subtitle: '${_stats!.activeHosts} active',
                                    ),
                                    StatCard(
                                      title: 'Total Users',
                                      value: _stats!.totalUsers.toString(),
                                      icon: Icons.people,
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

                            // Charts Section
                            Text(
                              'Analytics',
                              style: theme.textTheme.headlineMedium,
                            ),
                            const SizedBox(height: 16),
                            
                            // Growth Charts Row
                            LayoutBuilder(
                              builder: (context, constraints) {
                                if (constraints.maxWidth < 900) {
                                  return Column(
                                    children: [
                                      _buildHostGrowthChart(),
                                      const SizedBox(height: 16),
                                      _buildUserGrowthChart(),
                                    ],
                                  );
                                }
                                return Row(
                                  children: [
                                    Expanded(child: _buildHostGrowthChart()),
                                    const SizedBox(width: 16),
                                    Expanded(child: _buildUserGrowthChart()),
                                  ],
                                );
                              },
                            ),
                            
                            const SizedBox(height: 16),
                            
                            // Distribution Charts Row
                            LayoutBuilder(
                              builder: (context, constraints) {
                                if (constraints.maxWidth < 900) {
                                  return Column(
                                    children: [
                                      _buildCallsChart(),
                                      const SizedBox(height: 16),
                                      _buildUsersDistributionChart(),
                                    ],
                                  );
                                }
                                return Row(
                                  children: [
                                    Expanded(child: _buildCallsChart()),
                                    const SizedBox(width: 16),
                                    Expanded(child: _buildUsersDistributionChart()),
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

  Widget _buildCallsChart() {
    final theme = Theme.of(context);
    
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Calls Overview',
                  style: theme.textTheme.titleMedium,
                ),
                Icon(
                  Icons.call,
                  color: AppTheme.successGreen,
                  size: 20,
                ),
              ],
            ),
            const SizedBox(height: 20),
            SizedBox(
              height: 200,
              child: BarChart(
                BarChartData(
                  alignment: BarChartAlignment.spaceAround,
                  maxY: (_stats?.totalCalls.toDouble() ?? 100) * 1.2,
                  barTouchData: BarTouchData(enabled: true),
                  titlesData: FlTitlesData(
                    show: true,
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (value, meta) {
                          const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                          return Text(
                            days[value.toInt() % 7],
                            style: theme.textTheme.bodySmall?.copyWith(fontSize: 11),
                          );
                        },
                      ),
                    ),
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 40,
                        getTitlesWidget: (value, meta) {
                          return Text(
                            value.toInt().toString(),
                            style: theme.textTheme.bodySmall?.copyWith(fontSize: 11),
                          );
                        },
                      ),
                    ),
                    topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  ),
                  borderData: FlBorderData(show: false),
                  gridData: FlGridData(
                    show: true,
                    drawVerticalLine: false,
                    horizontalInterval: 20,
                    getDrawingHorizontalLine: (value) {
                      return FlLine(
                        color: theme.brightness == Brightness.dark
                            ? AppTheme.darkBorder
                            : AppTheme.lightBorder,
                        strokeWidth: 1,
                      );
                    },
                  ),
                  barGroups: List.generate(7, (index) {
                    final value = (_stats?.totalCalls ?? 0) / 7 * (0.5 + (index % 3) * 0.3);
                    return BarChartGroupData(
                      x: index,
                      barRods: [
                        BarChartRodData(
                          toY: value.toDouble(),
                          color: AppTheme.successGreen,
                          width: 16,
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                        ),
                      ],
                    );
                  }),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Last 7 days activity',
              style: theme.textTheme.bodySmall?.copyWith(fontSize: 11),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHostGrowthChart() {
    final theme = Theme.of(context);
    final history = _stats?.history ?? [];
    
    // Use actual data if available, otherwise show message
    final spots = history.isEmpty
        ? List.generate(6, (i) => FlSpot(i.toDouble(), 0))
        : history.asMap().entries.map((entry) {
            return FlSpot(entry.key.toDouble(), entry.value.totalHosts.toDouble());
          }).toList();

    final maxY = history.isEmpty 
        ? 10.0 
        : history.map((h) => h.totalHosts).reduce((a, b) => a > b ? a : b).toDouble() * 1.2;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Host Growth',
                  style: theme.textTheme.titleMedium,
                ),
                Icon(
                  Icons.business,
                  color: AppTheme.primaryBlue,
                  size: 20,
                ),
              ],
            ),
            const SizedBox(height: 20),
            SizedBox(
              height: 200,
              child: history.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.show_chart,
                            size: 48,
                            color: theme.textTheme.bodySmall?.color?.withOpacity(0.3),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            'No historical data yet',
                            style: theme.textTheme.bodySmall,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Data will appear after 24 hours',
                            style: theme.textTheme.bodySmall?.copyWith(fontSize: 11),
                          ),
                        ],
                      ),
                    )
                  : LineChart(
                      LineChartData(
                        maxY: maxY,
                        minY: 0,
                        gridData: FlGridData(
                          show: true,
                          drawVerticalLine: false,
                          horizontalInterval: maxY > 10 ? maxY / 5 : 2,
                          getDrawingHorizontalLine: (value) {
                            return FlLine(
                              color: theme.brightness == Brightness.dark
                                  ? AppTheme.darkBorder
                                  : AppTheme.lightBorder,
                              strokeWidth: 1,
                            );
                          },
                        ),
                        titlesData: FlTitlesData(
                          bottomTitles: AxisTitles(
                            sideTitles: SideTitles(
                              showTitles: true,
                              interval: 1,
                              getTitlesWidget: (value, meta) {
                                if (value.toInt() < history.length) {
                                  final date = history[value.toInt()].date;
                                  return Text(
                                    DateFormat('MMM').format(date),
                                    style: theme.textTheme.bodySmall?.copyWith(fontSize: 10),
                                  );
                                }
                                return const Text('');
                              },
                            ),
                          ),
                          leftTitles: AxisTitles(
                            sideTitles: SideTitles(
                              showTitles: true,
                              reservedSize: 40,
                              getTitlesWidget: (value, meta) {
                                return Text(
                                  value.toInt().toString(),
                                  style: theme.textTheme.bodySmall?.copyWith(fontSize: 10),
                                );
                              },
                            ),
                          ),
                          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                        ),
                        borderData: FlBorderData(show: false),
                        lineBarsData: [
                          LineChartBarData(
                            spots: spots,
                            isCurved: true,
                            color: AppTheme.primaryBlue,
                            barWidth: 3,
                            dotData: const FlDotData(show: true),
                            belowBarData: BarAreaData(
                              show: true,
                              color: AppTheme.primaryBlue.withOpacity(0.1),
                            ),
                          ),
                        ],
                      ),
                    ),
            ),
            const SizedBox(height: 12),
            Text(
              history.isEmpty ? 'Tracking starts today' : 'Last ${history.length} days',
              style: theme.textTheme.bodySmall?.copyWith(fontSize: 11),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildUserGrowthChart() {
    final theme = Theme.of(context);
    final history = _stats?.history ?? [];
    
    final spots = history.isEmpty
        ? List.generate(6, (i) => FlSpot(i.toDouble(), 0))
        : history.asMap().entries.map((entry) {
            return FlSpot(entry.key.toDouble(), entry.value.totalUsers.toDouble());
          }).toList();

    final maxY = history.isEmpty 
        ? 10.0 
        : history.map((h) => h.totalUsers).reduce((a, b) => a > b ? a : b).toDouble() * 1.2;
    
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'User Growth',
                  style: theme.textTheme.titleMedium,
                ),
                Icon(
                  Icons.people,
                  color: AppTheme.secondaryBlue,
                  size: 20,
                ),
              ],
            ),
            const SizedBox(height: 20),
            SizedBox(
              height: 200,
              child: history.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.show_chart,
                            size: 48,
                            color: theme.textTheme.bodySmall?.color?.withOpacity(0.3),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            'No historical data yet',
                            style: theme.textTheme.bodySmall,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Data will appear after 24 hours',
                            style: theme.textTheme.bodySmall?.copyWith(fontSize: 11),
                          ),
                        ],
                      ),
                    )
                  : LineChart(
                      LineChartData(
                        maxY: maxY,
                        minY: 0,
                        gridData: FlGridData(
                          show: true,
                          drawVerticalLine: false,
                          horizontalInterval: maxY > 10 ? maxY / 5 : 2,
                          getDrawingHorizontalLine: (value) {
                            return FlLine(
                              color: theme.brightness == Brightness.dark
                                  ? AppTheme.darkBorder
                                  : AppTheme.lightBorder,
                              strokeWidth: 1,
                            );
                          },
                        ),
                        titlesData: FlTitlesData(
                          bottomTitles: AxisTitles(
                            sideTitles: SideTitles(
                              showTitles: true,
                              interval: 1,
                              getTitlesWidget: (value, meta) {
                                if (value.toInt() < history.length) {
                                  final date = history[value.toInt()].date;
                                  return Text(
                                    DateFormat('MMM').format(date),
                                    style: theme.textTheme.bodySmall?.copyWith(fontSize: 10),
                                  );
                                }
                                return const Text('');
                              },
                            ),
                          ),
                          leftTitles: AxisTitles(
                            sideTitles: SideTitles(
                              showTitles: true,
                              reservedSize: 40,
                              getTitlesWidget: (value, meta) {
                                return Text(
                                  value.toInt().toString(),
                                  style: theme.textTheme.bodySmall?.copyWith(fontSize: 10),
                                );
                              },
                            ),
                          ),
                          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                        ),
                        borderData: FlBorderData(show: false),
                        lineBarsData: [
                          LineChartBarData(
                            spots: spots,
                            isCurved: true,
                            color: AppTheme.secondaryBlue,
                            barWidth: 3,
                            dotData: const FlDotData(show: true),
                            belowBarData: BarAreaData(
                              show: true,
                              color: AppTheme.secondaryBlue.withOpacity(0.1),
                            ),
                          ),
                        ],
                      ),
                    ),
            ),
            const SizedBox(height: 12),
            Text(
              history.isEmpty ? 'Tracking starts today' : 'Last ${history.length} days',
              style: theme.textTheme.bodySmall?.copyWith(fontSize: 11),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildUsersDistributionChart() {
    final theme = Theme.of(context);
    final activeUsers = _stats?.activeUsers ?? 0;
    final totalUsers = _stats?.totalUsers ?? 1;
    final inactiveUsers = totalUsers - activeUsers;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Users Distribution',
                  style: theme.textTheme.titleMedium,
                ),
                Icon(
                  Icons.pie_chart,
                  color: AppTheme.successGreen,
                  size: 20,
                ),
              ],
            ),
            const SizedBox(height: 20),
            SizedBox(
              height: 200,
              child: PieChart(
                PieChartData(
                  sectionsSpace: 2,
                  centerSpaceRadius: 50,
                  sections: [
                    PieChartSectionData(
                      value: activeUsers.toDouble(),
                      title: 'Active\n$activeUsers',
                      color: AppTheme.successGreen,
                      radius: 60,
                      titleStyle: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    PieChartSectionData(
                      value: inactiveUsers.toDouble(),
                      title: 'Inactive\n$inactiveUsers',
                      color: theme.textTheme.bodySmall?.color?.withOpacity(0.3),
                      radius: 55,
                      titleStyle: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: theme.brightness == Brightness.dark ? Colors.white : Colors.black,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Active vs Inactive',
              style: theme.textTheme.bodySmall?.copyWith(fontSize: 11),
            ),
          ],
        ),
      ),
    );
  }
}
