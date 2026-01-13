import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

import '../config/theme.dart';
import '../services/api_service.dart';

class BackupScreen extends StatefulWidget {
  const BackupScreen({super.key});

  @override
  State<BackupScreen> createState() => _BackupScreenState();
}

class _BackupScreenState extends State<BackupScreen> {
  bool _isLoading = true;
  bool _isCreatingBackup = false;
  String? _errorMessage;
  List<Map<String, dynamic>> _backups = [];

  @override
  void initState() {
    super.initState();
    _loadBackups();
  }

  Future<void> _loadBackups() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final apiService = context.read<ApiService>();
      final response = await apiService.get('/admin/database/backups');
      
      if (mounted) {
        setState(() {
          _backups = List<Map<String, dynamic>>.from(response['backups']);
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

  Future<void> _createBackup() async {
    setState(() => _isCreatingBackup = true);

    try {
      final apiService = context.read<ApiService>();
      final response = await apiService.post('/admin/database/backup', {});
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(response['message'] ?? 'Backup initiated'),
            duration: const Duration(seconds: 4),
          ),
        );
        _loadBackups();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString().replaceFirst('ApiException: ', '')}'),
            backgroundColor: AppTheme.dangerRed,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isCreatingBackup = false);
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
                        'Database Backups',
                        style: (isMobile 
                          ? theme.textTheme.headlineMedium
                          : theme.textTheme.displaySmall)?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Manage database backups and restores',
                        style: theme.textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (!isMobile) ...[
                      ElevatedButton.icon(
                        onPressed: _isCreatingBackup ? null : _createBackup,
                        icon: _isCreatingBackup
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                ),
                              )
                            : const Icon(Icons.backup, size: 20),
                        label: const Text('Create Backup'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.successGreen,
                        ),
                      ),
                      const SizedBox(width: 12),
                      ElevatedButton.icon(
                        onPressed: _loadBackups,
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
                    ] else ...[
                      IconButton(
                        onPressed: _isCreatingBackup ? null : _createBackup,
                        icon: _isCreatingBackup
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Icon(Icons.backup),
                        tooltip: 'Create Backup',
                      ),
                      IconButton(
                        onPressed: _loadBackups,
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
                  ],
                ),
              ],
            ),
          ),

          // Content
          Expanded(
            child: _isLoading && _backups.isEmpty
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
                            Text('Failed to load backups', style: theme.textTheme.titleLarge),
                            const SizedBox(height: 8),
                            Text(_errorMessage!, style: theme.textTheme.bodySmall),
                            const SizedBox(height: 24),
                            ElevatedButton.icon(
                              onPressed: _loadBackups,
                              icon: const Icon(Icons.refresh),
                              label: const Text('Retry'),
                            ),
                          ],
                        ),
                      )
                    : _backups.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.backup_outlined,
                                  size: 64,
                                  color: theme.textTheme.bodySmall?.color?.withOpacity(0.3),
                                ),
                                const SizedBox(height: 16),
                                Text('No backups yet', style: theme.textTheme.titleLarge),
                                const SizedBox(height: 8),
                                Text(
                                  'Click "Create Backup" to create your first backup',
                                  style: theme.textTheme.bodySmall,
                                ),
                              ],
                            ),
                          )
                        : ListView.separated(
                            padding: EdgeInsets.all(isMobile ? 16 : 32),
                            itemCount: _backups.length,
                            separatorBuilder: (context, index) => const SizedBox(height: 12),
                            itemBuilder: (context, index) {
                              final backup = _backups[index];
                              return _buildBackupCard(backup);
                            },
                          ),
          ),
        ],
      ),
    );
  }

  Widget _buildBackupCard(Map<String, dynamic> backup) {
    final theme = Theme.of(context);
    final status = backup['status'] ?? 'unknown';
    final filename = backup['filename'] ?? 'unknown';
    final createdAt = backup['created_at'] != null
        ? DateTime.tryParse(backup['created_at'])
        : null;
    final completedAt = backup['completed_at'] != null
        ? DateTime.tryParse(backup['completed_at'])
        : null;
    final fileSize = backup['file_size'];
    final triggeredBy = backup['triggered_by'] ?? 'System';

    Color statusColor;
    IconData statusIcon;
    
    switch (status) {
      case 'completed':
        statusColor = AppTheme.successGreen;
        statusIcon = Icons.check_circle;
        break;
      case 'failed':
        statusColor = AppTheme.dangerRed;
        statusIcon = Icons.error;
        break;
      default:
        statusColor = AppTheme.warningOrange;
        statusIcon = Icons.pending;
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: statusColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(statusIcon, color: statusColor, size: 32),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    filename,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontFamily: 'monospace',
                      fontSize: 13,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 16,
                    runSpacing: 4,
                    children: [
                      if (createdAt != null)
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.schedule, size: 14, color: theme.textTheme.bodySmall?.color),
                            const SizedBox(width: 4),
                            Text(
                              DateFormat('MMM dd, HH:mm').format(createdAt),
                              style: theme.textTheme.bodySmall?.copyWith(fontSize: 12),
                            ),
                          ],
                        ),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.person, size: 14, color: theme.textTheme.bodySmall?.color),
                          const SizedBox(width: 4),
                          Text(
                            triggeredBy,
                            style: theme.textTheme.bodySmall?.copyWith(fontSize: 12),
                          ),
                        ],
                      ),
                      if (fileSize != null)
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.storage, size: 14, color: theme.textTheme.bodySmall?.color),
                            const SizedBox(width: 4),
                            Text(
                              _formatFileSize(fileSize),
                              style: theme.textTheme.bodySmall?.copyWith(fontSize: 12),
                            ),
                          ],
                        ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: statusColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: statusColor.withOpacity(0.3)),
              ),
              child: Text(
                status.toUpperCase(),
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: statusColor,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatFileSize(dynamic bytes) {
    final size = int.tryParse(bytes.toString()) ?? 0;
    if (size < 1024) return '$size B';
    if (size < 1024 * 1024) return '${(size / 1024).toStringAsFixed(1)} KB';
    if (size < 1024 * 1024 * 1024) return '${(size / (1024 * 1024)).toStringAsFixed(1)} MB';
    return '${(size / (1024 * 1024 * 1024)).toStringAsFixed(2)} GB';
  }
}
