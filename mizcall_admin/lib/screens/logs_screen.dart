import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

import '../config/theme.dart';
import '../config/app_config.dart';
import '../models/log_entry.dart';
import '../services/api_service.dart';

class LogsScreen extends StatefulWidget {
  const LogsScreen({super.key});

  @override
  State<LogsScreen> createState() => _LogsScreenState();
}

class _LogsScreenState extends State<LogsScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  List<LogEntry> _logs = [];
  LogLevel? _filterLevel;
  String? _filterService;
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _loadLogs();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadLogs() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final apiService = context.read<ApiService>();
      final response = await apiService.get(AppConfig.logsEndpoint);
      
      setState(() {
        _logs = (response['logs'] as List)
            .map((json) => LogEntry.fromJson(json))
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

  List<LogEntry> get _filteredLogs {
    var filtered = _logs;
    
    if (_filterLevel != null) {
      filtered = filtered.where((log) => log.level == _filterLevel).toList();
    }
    
    if (_filterService != null) {
      filtered = filtered.where((log) => log.service == _filterService).toList();
    }
    
    return filtered;
  }

  Set<String> get _services {
    return _logs.map((log) => log.service).toSet();
  }

  Color _getLevelColor(LogLevel level) {
    switch (level) {
      case LogLevel.error:
        return AppTheme.dangerRed;
      case LogLevel.warning:
        return AppTheme.warningOrange;
      case LogLevel.debug:
        return AppTheme.secondaryBlue;
      case LogLevel.info:
        return AppTheme.successGreen;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final filteredLogs = _filteredLogs;

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
                
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (isMobile)
                      Column(
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
                                      'System Logs',
                                      style: theme.textTheme.headlineMedium?.copyWith(
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      '${_logs.length} logs',
                                      style: theme.textTheme.bodySmall,
                                    ),
                                  ],
                                ),
                              ),
                              Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  IconButton(
                                    onPressed: () {
                                      setState(() {
                                        _filterLevel = null;
                                        _filterService = null;
                                      });
                                    },
                                    icon: const Icon(Icons.clear_all, size: 20),
                                    tooltip: 'Clear Filters',
                                  ),
                                  IconButton(
                                    onPressed: _loadLogs,
                                    icon: _isLoading
                                        ? const SizedBox(
                                            width: 20,
                                            height: 20,
                                            child: CircularProgressIndicator(strokeWidth: 2),
                                          )
                                        : const Icon(Icons.refresh, size: 20),
                                    tooltip: 'Refresh',
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ],
                      )
                    else
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'System Logs',
                                style: theme.textTheme.displaySmall?.copyWith(
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${_logs.length} total logs',
                                style: theme.textTheme.bodySmall,
                              ),
                            ],
                          ),
                          Row(
                            children: [
                              ElevatedButton.icon(
                                onPressed: () {
                                  setState(() {
                                    _filterLevel = null;
                                    _filterService = null;
                                  });
                                },
                                icon: const Icon(Icons.clear_all, size: 20),
                                label: const Text('Clear Filters'),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: theme.brightness == Brightness.dark
                                      ? AppTheme.darkCard
                                      : Colors.white,
                                  foregroundColor: theme.textTheme.bodyMedium?.color,
                                ),
                              ),
                              const SizedBox(width: 12),
                              ElevatedButton.icon(
                                onPressed: _loadLogs,
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
                    const SizedBox(height: 20),

                // Filters (Responsive)
                LayoutBuilder(
                  builder: (context, constraints) {
                    if (constraints.maxWidth < 600) {
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: DropdownButton<LogLevel?>(
                                  value: _filterLevel,
                                  hint: const Text('All Levels'),
                                  isExpanded: true,
                                  items: [
                                    const DropdownMenuItem(value: null, child: Text('All Levels')),
                                    ...LogLevel.values.map((level) {
                                      return DropdownMenuItem(
                                        value: level,
                                        child: Row(
                                          children: [
                                            Container(
                                              width: 8,
                                              height: 8,
                                              decoration: BoxDecoration(
                                                color: _getLevelColor(level),
                                                shape: BoxShape.circle,
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            Text(level.name.toUpperCase()),
                                          ],
                                        ),
                                      );
                                    }),
                                  ],
                                  onChanged: (value) {
                                    setState(() => _filterLevel = value);
                                  },
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: DropdownButton<String?>(
                                  value: _filterService,
                                  hint: const Text('All Services'),
                                  isExpanded: true,
                                  items: [
                                    const DropdownMenuItem(value: null, child: Text('All Services')),
                                    ..._services.map((service) {
                                      return DropdownMenuItem(
                                        value: service,
                                        child: Text(service),
                                      );
                                    }),
                                  ],
                                  onChanged: (value) {
                                    setState(() => _filterService = value);
                                  },
                                ),
                              ),
                            ],
                          ),
                        ],
                      );
                    }
                    
                    return Row(
                      children: [
                        // Level Filter
                        DropdownButton<LogLevel?>(
                          value: _filterLevel,
                          hint: const Text('All Levels'),
                          items: [
                            const DropdownMenuItem(value: null, child: Text('All Levels')),
                            ...LogLevel.values.map((level) {
                              return DropdownMenuItem(
                                value: level,
                                child: Row(
                                  children: [
                                    Container(
                                      width: 8,
                                      height: 8,
                                      decoration: BoxDecoration(
                                        color: _getLevelColor(level),
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Text(level.name.toUpperCase()),
                                  ],
                                ),
                              );
                            }),
                          ],
                          onChanged: (value) {
                            setState(() => _filterLevel = value);
                          },
                        ),
                        const SizedBox(width: 20),

                        // Service Filter
                        DropdownButton<String?>(
                          value: _filterService,
                          hint: const Text('All Services'),
                          items: [
                            const DropdownMenuItem(value: null, child: Text('All Services')),
                            ..._services.map((service) {
                              return DropdownMenuItem(
                                value: service,
                                child: Text(service),
                              );
                            }),
                          ],
                          onChanged: (value) {
                            setState(() => _filterService = value);
                          },
                        ),
                      ],
                    );
                  },
                  ),
                ],
              );
              },
            ),
          ),

          // Content
          Expanded(
            child: _isLoading && _logs.isEmpty
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
                            Text('Failed to load logs', style: theme.textTheme.titleLarge),
                            const SizedBox(height: 8),
                            Text(_errorMessage!, style: theme.textTheme.bodySmall),
                            const SizedBox(height: 24),
                            ElevatedButton.icon(
                              onPressed: _loadLogs,
                              icon: const Icon(Icons.refresh),
                              label: const Text('Retry'),
                            ),
                          ],
                        ),
                      )
                    : filteredLogs.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.search_off, size: 64, color: theme.textTheme.bodySmall?.color),
                                const SizedBox(height: 16),
                                Text('No logs found', style: theme.textTheme.titleMedium),
                              ],
                            ),
                          )
                        : ListView.separated(
                            controller: _scrollController,
                            padding: EdgeInsets.all(MediaQuery.of(context).size.width < 800 ? 16 : 32),
                            itemCount: filteredLogs.length,
                            separatorBuilder: (context, index) => const SizedBox(height: 8),
                            itemBuilder: (context, index) {
                              final log = filteredLogs[index];
                              return _buildLogEntry(log);
                            },
                          ),
          ),
        ],
      ),
    );
  }

  Widget _buildLogEntry(LogEntry log) {
    final theme = Theme.of(context);
    final levelColor = _getLevelColor(log.level);
    final isMobile = MediaQuery.of(context).size.width < 800;

    if (isMobile) {
      // Mobile: Vertical layout
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: levelColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: levelColor.withOpacity(0.3)),
                    ),
                    child: Text(
                      log.levelText,
                      style: TextStyle(
                        color: levelColor,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryBlue.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      log.service,
                      style: const TextStyle(
                        color: AppTheme.primaryBlue,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const Spacer(),
                  Text(
                    DateFormat('HH:mm:ss').format(log.timestamp),
                    style: theme.textTheme.bodySmall?.copyWith(
                      fontSize: 11,
                      fontFamily: 'monospace',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                log.message,
                style: theme.textTheme.bodySmall?.copyWith(
                  fontFamily: 'monospace',
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
      );
    }

    // Desktop: Horizontal layout
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Timestamp
            SizedBox(
              width: 140,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    DateFormat('MMM dd, yyyy').format(log.timestamp),
                    style: theme.textTheme.bodySmall?.copyWith(fontSize: 12),
                  ),
                  Text(
                    DateFormat('HH:mm:ss').format(log.timestamp),
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontFamily: 'monospace',
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),

            // Level Badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: levelColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: levelColor.withOpacity(0.3)),
              ),
              child: Text(
                log.levelText,
                style: TextStyle(
                  color: levelColor,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  fontFamily: 'monospace',
                ),
              ),
            ),
            const SizedBox(width: 16),

            // Service
            SizedBox(
              width: 120,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: AppTheme.primaryBlue.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  log.service,
                  style: const TextStyle(
                    color: AppTheme.primaryBlue,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                ),
              ),
            ),
            const SizedBox(width: 16),

            // Message
            Expanded(
              child: Text(
                log.message,
                style: theme.textTheme.bodyMedium?.copyWith(
                  fontFamily: 'monospace',
                  fontSize: 13,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
