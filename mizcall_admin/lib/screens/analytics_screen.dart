import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';

import '../config/theme.dart';
import '../services/api_service.dart';

class AnalyticsScreen extends StatefulWidget {
  const AnalyticsScreen({super.key});

  @override
  State<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends State<AnalyticsScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  Map<String, dynamic>? _analyticsData;

  @override
  void initState() {
    super.initState();
    _loadAnalytics();
  }

  Future<void> _loadAnalytics() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final apiService = context.read<ApiService>();
      final response = await apiService.get('/admin/analytics');
      
      if (mounted) {
        setState(() {
          _analyticsData = response;
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
    final isMobile = MediaQuery.of(context).size.width < 800;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: Column(
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
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Analytics',
                        style: (isMobile 
                          ? theme.textTheme.headlineMedium
                          : theme.textTheme.displaySmall)?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Business insights and trends',
                        style: theme.textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
                if (!isMobile)
                  ElevatedButton.icon(
                    onPressed: _loadAnalytics,
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
                  )
                else
                  IconButton(
                    onPressed: _loadAnalytics,
                    icon: _isLoading
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.refresh),
                  ),
              ],
            ),
          ),

          // Content
          Expanded(
            child: _isLoading && _analyticsData == null
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
                            Text('Failed to load analytics', style: theme.textTheme.titleLarge),
                            const SizedBox(height: 8),
                            Text(_errorMessage!, style: theme.textTheme.bodySmall),
                            const SizedBox(height: 24),
                            ElevatedButton.icon(
                              onPressed: _loadAnalytics,
                              icon: const Icon(Icons.refresh),
                              label: const Text('Retry'),
                            ),
                          ],
                        ),
                      )
                    : SingleChildScrollView(
                        padding: EdgeInsets.all(isMobile ? 16 : 32),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Retention Card
                            _buildRetentionCard(),
                            const SizedBox(height: 20),

                            // Charts
                            LayoutBuilder(
                              builder: (context, constraints) {
                                if (constraints.maxWidth < 900) {
                                  return Column(
                                    children: [
                                      _buildCallDurationChart(),
                                      const SizedBox(height: 16),
                                      _buildPeakHoursChart(),
                                    ],
                                  );
                                }
                                return Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Expanded(child: _buildCallDurationChart()),
                                    const SizedBox(width: 16),
                                    Expanded(child: _buildPeakHoursChart()),
                                  ],
                                );
                              },
                            ),
                            const SizedBox(height: 20),

                            // Host Activity Table
                            _buildHostActivityTable(),
                          ],
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildRetentionCard() {
    final theme = Theme.of(context);
    final retention = _analyticsData?['retention'] ?? {};
    final totalUsers = retention['total_users'] ?? 0;
    final activeUsers = retention['active_users'] ?? 0;
    final retentionRate = totalUsers > 0 
        ? ((activeUsers / totalUsers) * 100).toStringAsFixed(1)
        : '0.0';

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('30-Day Retention Rate', style: theme.textTheme.titleMedium),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Text(
                        '$retentionRate%',
                        style: theme.textTheme.displaySmall?.copyWith(
                          color: AppTheme.primaryBlue,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Text(
                        '$activeUsers / $totalUsers users active',
                        style: theme.textTheme.bodySmall,
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Icon(
              Icons.trending_up,
              size: 48,
              color: AppTheme.successGreen,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCallDurationChart() {
    final theme = Theme.of(context);
    final durations = _analyticsData?['callDurations'] as List? ?? [];

    if (durations.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              Text('Call Duration Trends', style: theme.textTheme.titleMedium),
              const SizedBox(height: 40),
              Icon(Icons.show_chart, size: 48, color: theme.textTheme.bodySmall?.color?.withOpacity(0.3)),
              const SizedBox(height: 12),
              Text('No call data available', style: theme.textTheme.bodySmall),
            ],
          ),
        ),
      );
    }

    final spots = durations.asMap().entries.map((entry) {
      final avgDuration = double.tryParse(entry.value['avg_duration_minutes']?.toString() ?? '0') ?? 0;
      return FlSpot(entry.key.toDouble(), avgDuration);
    }).toList();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Average Call Duration (30 Days)', style: theme.textTheme.titleMedium),
            const SizedBox(height: 20),
            SizedBox(
              height: 200,
              child: LineChart(
                LineChartData(
                  gridData: FlGridData(
                    show: true,
                    drawVerticalLine: false,
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
                        interval: durations.length > 15 ? 7 : 3,
                        getTitlesWidget: (value, meta) {
                          if (value.toInt() < durations.length) {
                            final day = durations[value.toInt()]['day'];
                            if (day != null) {
                              final date = DateTime.parse(day);
                              return Text(
                                DateFormat('MMM dd').format(date),
                                style: theme.textTheme.bodySmall?.copyWith(fontSize: 10),
                              );
                            }
                          }
                          return const Text('');
                        },
                      ),
                    ),
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 50,
                        getTitlesWidget: (value, meta) {
                          return Text(
                            '${value.toInt()}min',
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
          ],
        ),
      ),
    );
  }

  Widget _buildPeakHoursChart() {
    final theme = Theme.of(context);
    final peakHours = _analyticsData?['peakHours'] as List? ?? [];

    if (peakHours.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              Text('Peak Usage Hours', style: theme.textTheme.titleMedium),
              const SizedBox(height: 40),
              Icon(Icons.access_time, size: 48, color: theme.textTheme.bodySmall?.color?.withOpacity(0.3)),
              const SizedBox(height: 12),
              Text('No usage data available', style: theme.textTheme.bodySmall),
            ],
          ),
        ),
      );
    }

    // Create full 24-hour data
    final hourlyData = List.generate(24, (hour) {
      final hourData = peakHours.firstWhere(
        (h) => int.tryParse(h['hour']?.toString() ?? '-1') == hour,
        orElse: () => {'hour': hour, 'call_count': 0},
      );
      return int.tryParse(hourData['call_count']?.toString() ?? '0') ?? 0;
    });

    final maxCount = hourlyData.reduce((a, b) => a > b ? a : b);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Peak Usage Hours (7 Days)', style: theme.textTheme.titleMedium),
            const SizedBox(height: 20),
            SizedBox(
              height: 200,
              child: BarChart(
                BarChartData(
                  alignment: BarChartAlignment.spaceAround,
                  maxY: maxCount > 0 ? maxCount.toDouble() * 1.2 : 10,
                  barGroups: List.generate(24, (index) {
                    final value = hourlyData[index].toDouble();
                    final isTop = value > maxCount * 0.7;
                    return BarChartGroupData(
                      x: index,
                      barRods: [
                        BarChartRodData(
                          toY: value,
                          color: isTop ? AppTheme.dangerRed : AppTheme.successGreen,
                          width: 8,
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                        ),
                      ],
                    );
                  }),
                  titlesData: FlTitlesData(
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        interval: 3,
                        getTitlesWidget: (value, meta) {
                          return Text(
                            '${value.toInt()}h',
                            style: theme.textTheme.bodySmall?.copyWith(fontSize: 10),
                          );
                        },
                      ),
                    ),
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 35,
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
                  gridData: FlGridData(
                    show: true,
                    drawVerticalLine: false,
                    getDrawingHorizontalLine: (value) {
                      return FlLine(
                        color: theme.brightness == Brightness.dark
                            ? AppTheme.darkBorder
                            : AppTheme.lightBorder,
                        strokeWidth: 1,
                      );
                    },
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHostActivityTable() {
    final theme = Theme.of(context);
    final hostActivity = _analyticsData?['hostActivity'] as List? ?? [];

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Top Active Hosts (30 Days)', style: theme.textTheme.titleMedium),
            const SizedBox(height: 16),
            if (hostActivity.isEmpty)
              Center(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Text('No host activity data', style: theme.textTheme.bodySmall),
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: hostActivity.length,
                separatorBuilder: (context, index) => const Divider(height: 1),
                itemBuilder: (context, index) {
                  final host = hostActivity[index];
                  final callCount = int.tryParse(host['total_calls']?.toString() ?? '0') ?? 0;
                  final lastCall = host['last_call_at'];

                  return ListTile(
                    leading: CircleAvatar(
                      backgroundColor: AppTheme.primaryBlue,
                      child: Text(
                        (host['display_name'] ?? host['id'] ?? 'H')[0].toUpperCase(),
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                      ),
                    ),
                    title: Text(host['display_name'] ?? host['email'] ?? host['id'] ?? 'Unknown'),
                    subtitle: Text(
                      lastCall != null
                          ? 'Last call: ${DateFormat('MMM dd, HH:mm').format(DateTime.parse(lastCall))}'
                          : 'No calls yet',
                    ),
                    trailing: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppTheme.successGreen.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '$callCount calls',
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          color: AppTheme.successGreen,
                        ),
                      ),
                    ),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }
}
