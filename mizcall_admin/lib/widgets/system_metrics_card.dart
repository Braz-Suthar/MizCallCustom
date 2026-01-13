import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'dart:async';

import '../config/theme.dart';
import '../services/api_service.dart';

class SystemMetricsCard extends StatefulWidget {
  const SystemMetricsCard({super.key});

  @override
  State<SystemMetricsCard> createState() => _SystemMetricsCardState();
}

class _SystemMetricsCardState extends State<SystemMetricsCard> {
  Map<String, dynamic>? _metrics;
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    _loadMetrics();
    _startAutoRefresh();
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  void _startAutoRefresh() {
    _refreshTimer = Timer.periodic(const Duration(seconds: 5), (timer) {
      if (mounted) {
        _loadMetrics();
      }
    });
  }

  Future<void> _loadMetrics() async {
    try {
      final apiService = context.read<ApiService>();
      final response = await apiService.get('/admin/system-metrics');
      if (mounted) {
        setState(() {
          _metrics = response;
        });
      }
    } catch (e) {
      print('[SystemMetrics] Load error: $e');
      // If fails, show placeholder data
      if (mounted) {
        setState(() {
          _metrics = {
            'cpu': {'load1min': '0', 'cores': 1},
            'memory': {'usedPercent': '0'},
            'uptime': {'formatted': 'Unknown'},
          };
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (_metrics == null) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              const CircularProgressIndicator(),
              const SizedBox(height: 12),
              Text(
                'Loading system metrics...',
                style: theme.textTheme.bodySmall,
              ),
            ],
          ),
        ),
      );
    }

    final cpu = _metrics!['cpu'] ?? {};
    final memory = _metrics!['memory'] ?? {};
    final uptime = _metrics!['uptime'] ?? {};
    
    final memoryUsedPercent = double.tryParse(memory['usedPercent']?.toString() ?? '0') ?? 0;
    final cpuPercent = double.tryParse(cpu['percentage']?.toString() ?? '0') ?? 0;

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
                  'System Resources',
                  style: theme.textTheme.titleMedium,
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
                            size: 6,
                            color: AppTheme.successGreen,
                          ),
                          SizedBox(width: 4),
                          Text(
                            'Live',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.successGreen,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Icon(
                      Icons.computer,
                      color: AppTheme.primaryBlue,
                      size: 20,
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 20),

            // CPU Usage
            _buildMetricBar(
              'CPU Usage',
              cpuPercent,
              100,
              Icons.memory,
              AppTheme.primaryBlue,
            ),
            const SizedBox(height: 16),

            // Memory Usage
            _buildMetricBar(
              'Memory',
              memoryUsedPercent,
              100,
              Icons.storage,
              AppTheme.warningOrange,
            ),
            const SizedBox(height: 16),

            // Uptime
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(
                      Icons.schedule,
                      size: 18,
                      color: theme.textTheme.bodySmall?.color,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Uptime',
                      style: theme.textTheme.bodyMedium,
                    ),
                  ],
                ),
                Text(
                  uptime['formatted'] ?? 'Unknown',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: AppTheme.successGreen,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetricBar(String label, double value, num max, IconData icon, Color color) {
    final theme = Theme.of(context);
    final percentage = max == 100 ? value.clamp(0, 100) : (max > 0 ? (value / max * 100).clamp(0, 100) : 0);
    final displayValue = '${value.toStringAsFixed(1)}%';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Icon(icon, size: 18, color: theme.textTheme.bodySmall?.color),
                const SizedBox(width: 8),
                Text(
                  label,
                  style: theme.textTheme.bodyMedium,
                ),
              ],
            ),
            Text(
              displayValue,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
                color: percentage > 80 ? AppTheme.dangerRed : color,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: LinearProgressIndicator(
            value: percentage / 100,
            minHeight: 8,
            backgroundColor: theme.brightness == Brightness.dark
                ? AppTheme.darkBorder
                : AppTheme.lightBorder,
            valueColor: AlwaysStoppedAnimation(
              percentage > 80 ? AppTheme.dangerRed : color,
            ),
          ),
        ),
      ],
    );
  }
}
