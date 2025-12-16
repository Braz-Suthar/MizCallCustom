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
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();

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
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _createUser() async {
    setState(() {
      _busy = true;
      _error = null;
      _message = null;
    });

    try {
      final username = _usernameController.text.trim();
      final password = _passwordController.text.trim();
      if (username.isEmpty) {
        throw Exception('Username required');
      }

      final created = await _auth.createUser(
        token: widget.jwtToken,
        username: username,
        password: password.isEmpty ? null : password,
      );

      setState(() {
        _message =
            'User created: ${created.userId}${created.password != null ? " / pwd: ${created.password}" : ""}';
      });
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
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

    return RefreshIndicator(
      onRefresh: _refreshData,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Dashboard',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  if (widget.hostId != null)
                    Text(
                      'Host ID: ${widget.hostId}',
                      style: const TextStyle(color: Colors.white70),
                    ),
                ],
              ),
              IconButton(
                onPressed: _refreshData,
                icon: const Icon(Icons.refresh),
              ),
            ],
          ),
          const SizedBox(height: 12),
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
                const SizedBox(height: 12),
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    minimumSize: const Size.fromHeight(56),
                  ),
                  onPressed: _busy ? null : _createUser,
                  icon: const Icon(Icons.person_add_alt_1),
                  label: const Text('Create User'),
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
                  'Add user',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _usernameController,
                  decoration: const InputDecoration(
                    labelText: 'New user username',
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _passwordController,
                  decoration: const InputDecoration(
                    labelText: 'Password (optional, random if blank)',
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _busy ? null : _createUser,
                    child: _busy
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Add new user'),
                  ),
                ),
              ],
            ),
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
  }

  Widget _buildCard({required Widget child}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.blueGrey.shade900,
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

