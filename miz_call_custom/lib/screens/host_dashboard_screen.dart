import 'package:flutter/material.dart';

import '../core/auth.dart';
import '../core/config.dart';
import 'call_screen.dart';

class HostDashboardScreen extends StatelessWidget {
  const HostDashboardScreen({
    super.key,
    required this.jwtToken,
    this.hostId,
  });

  final String jwtToken;
  final String? hostId;

  @override
  @override
  Widget build(BuildContext context) {
    return HostDashboardBody(
      jwtToken: jwtToken,
      hostId: hostId,
    );
  }
}

class HostDashboardBody extends StatefulWidget {
  const HostDashboardBody({
    super.key,
    required this.jwtToken,
    this.hostId,
  });

  final String jwtToken;
  final String? hostId;

  @override
  State<HostDashboardBody> createState() => _HostDashboardBodyState();
}

class _HostDashboardBodyState extends State<HostDashboardBody> {
  final _auth = AuthService();
  bool _busy = false;
  String? _message;
  String? _error;
  List<HostUser> _users = const [];
  List<HostCall> _calls = const [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _refreshData();
  }

  @override
  void dispose() {
    super.dispose();
  }

  Future<void> _startCall() async {
    setState(() {
      _busy = true;
      _error = null;
      _message = null;
    });

    try {
      final roomId = await _auth.startHostCall(token: widget.jwtToken);
      if (!mounted) return;
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => CallScreen(
            jwtToken: widget.jwtToken,
            wsUrl: defaultWsUrl,
          ),
        ),
      );
      setState(() => _message = 'Call started (room $roomId)');
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _refreshData() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final users = await _auth.fetchUsers(token: widget.jwtToken);
      final calls = await _auth.fetchCalls(token: widget.jwtToken);
      if (!mounted) return;
      setState(() {
        _users = users;
        _calls = calls;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final totalUsers = _users.length;
    final totalCalls = _calls.length;
    final activeCalls = _calls.where((c) => c.endedAt == null).length;
    final activeUsers = _users.where((u) => u.enabled).length;
    final recentEnded = _calls
        .where((c) => c.endedAt != null)
        .toList()
      ..sort((a, b) => b.startedAt.compareTo(a.startedAt));

    final content = RefreshIndicator(
      onRefresh: _refreshData,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Quick Actions',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 12),
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    minimumSize: const Size.fromHeight(56),
                  ),
                  onPressed: _busy ? null : _startCall,
                  icon: const Icon(Icons.call),
                  label: const Text('New Call'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              _statCard('Total Users', totalUsers.toString()),
              _statCard('Total Calls', totalCalls.toString()),
              _statCard('Active Users', activeUsers.toString()),
              _statCard('Active Calls', activeCalls.toString()),
            ],
          ),
          const SizedBox(height: 16),
          _buildCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Recent Activity',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                if (_loading)
                  const Padding(
                    padding: EdgeInsets.all(12),
                    child: Center(child: CircularProgressIndicator()),
                  )
                else if (recentEnded.isEmpty)
                  const Padding(
                    padding: EdgeInsets.all(12),
                    child: Text('No recent activity'),
                  )
                else
                  ...recentEnded.take(5).map(
                        (c) => ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: const Icon(Icons.call),
                          title: Text('Call ${c.id} ended'),
                          subtitle: Text(
                            'Started: ${c.startedAt}${c.endedAt != null ? '\nEnded: ${c.endedAt}' : ''}',
                          ),
                        ),
                      ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          if (_error != null)
            Text(
              _error!,
              style: const TextStyle(color: Colors.redAccent),
            ),
          if (_message != null)
            Text(
              _message!,
              style: const TextStyle(color: Colors.green),
            ),
        ],
      ),
    );

    return Stack(
      children: [
        content,
        Positioned(
          bottom: 24,
          right: 24,
          child: FloatingActionButton(
            backgroundColor: Colors.green,
            onPressed: () {},
            child: const Icon(Icons.chat),
          ),
        ),
      ],
    );
  }

  Widget _buildCard({required Widget child}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
      ),
      child: child,
    );
  }

  Widget _statCard(String label, String value) {
    final width = (MediaQuery.of(context).size.width - 48) / 2;
    return SizedBox(
      width: width,
      child: _buildCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(color: Colors.white70)),
            const SizedBox(height: 8),
            Text(
              value,
              style: const TextStyle(
                fontSize: 26,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

