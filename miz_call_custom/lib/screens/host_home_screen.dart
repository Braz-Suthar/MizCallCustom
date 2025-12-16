import 'package:flutter/material.dart';

import 'host_dashboard_screen.dart';
import '../core/auth.dart';

class HostHomeScreen extends StatefulWidget {
  const HostHomeScreen({
    super.key,
    required this.jwtToken,
    this.hostId,
  });

  final String jwtToken;
  final String? hostId;

  @override
  State<HostHomeScreen> createState() => _HostHomeScreenState();
}

class _HostHomeScreenState extends State<HostHomeScreen> {
  int _index = 0;

  late final List<_TabSpec> _tabs = [
    _TabSpec(
      label: 'Dashboard',
      icon: Icons.dashboard_outlined,
      builder: () => HostDashboardBody(
        jwtToken: widget.jwtToken,
        hostId: widget.hostId,
      ),
    ),
    _TabSpec(
      label: 'Users',
      icon: Icons.group_outlined,
      builder: () => HostUsersTab(jwtToken: widget.jwtToken),
    ),
    _TabSpec(
      label: 'Calls',
      icon: Icons.call_outlined,
      builder: () => HostCallsTab(jwtToken: widget.jwtToken),
    ),
    _TabSpec(
      label: 'Recordings',
      icon: Icons.library_music_outlined,
      builder: () => _PlaceholderTab(
        title: 'Recordings',
        message: 'View and manage recordings (coming soon).',
      ),
    ),
    _TabSpec(
      label: 'Settings',
      icon: Icons.settings_outlined,
      builder: () => HostSettingsTab(
        jwtToken: widget.jwtToken,
        hostId: widget.hostId,
      ),
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final tab = _tabs[_index];

    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: Text(tab.label),
      ),
      body: tab.builder(),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _index,
        type: BottomNavigationBarType.fixed,
        onTap: (i) => setState(() => _index = i),
        items: _tabs
            .map(
              (t) => BottomNavigationBarItem(
                icon: Icon(t.icon),
                label: t.label,
              ),
            )
            .toList(),
      ),
    );
  }
}

class _TabSpec {
  _TabSpec({
    required this.label,
    required this.icon,
    required this.builder,
  });
  final String label;
  final IconData icon;
  final Widget Function() builder;
}

class HostUsersTab extends StatefulWidget {
  const HostUsersTab({super.key, required this.jwtToken});
  final String jwtToken;

  @override
  State<HostUsersTab> createState() => _HostUsersTabState();
}

class _HostUsersTabState extends State<HostUsersTab> {
  final _auth = AuthService();
  late Future<List<HostUser>> _future;

  @override
  void initState() {
    super.initState();
    _future = _auth.fetchUsers(token: widget.jwtToken);
  }

  Future<void> _refresh() async {
    setState(() {
      _future = _auth.fetchUsers(token: widget.jwtToken);
    });
  }

  Future<void> _addUser() async {
    String username = '';
    String password = '';
    final formKey = GlobalKey<FormState>();

    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: const Text('Add new user'),
          content: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  decoration: const InputDecoration(labelText: 'Username'),
                  onChanged: (v) => username = v,
                  validator: (v) =>
                      v == null || v.trim().isEmpty ? 'Required' : null,
                ),
                TextFormField(
                  decoration:
                      const InputDecoration(labelText: 'Password (optional)'),
                  onChanged: (v) => password = v,
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () {
                if (formKey.currentState?.validate() ?? false) {
                  Navigator.pop(ctx, true);
                }
              },
              child: const Text('Create'),
            ),
          ],
        );
      },
    );

    if (result != true) return;

    await _auth.createUser(
      token: widget.jwtToken,
      username: username.trim(),
      password: password.trim().isEmpty ? null : password.trim(),
    );

    if (mounted) await _refresh();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: const Text('Users'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _refresh,
          ),
        ],
      ),
      body: FutureBuilder<List<HostUser>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(
              child: Text(
                'Error: ${snapshot.error}',
                textAlign: TextAlign.center,
              ),
            );
          }
          final users = snapshot.data ?? [];
          if (users.isEmpty) {
            return const Center(child: Text('No users yet.'));
          }
          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView.builder(
              itemCount: users.length,
              itemBuilder: (ctx, i) {
                final u = users[i];
                return ListTile(
                  title: Text('${u.username} (${u.id})'),
                  subtitle: Text(
                    'Status: ${u.enabled ? "enabled" : "disabled"}'
                    '${u.lastSpeaking != null ? " • last speaking: ${u.lastSpeaking}" : ""}',
                  ),
                );
              },
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _addUser,
        child: const Icon(Icons.person_add_alt_1),
      ),
    );
  }
}

class HostCallsTab extends StatefulWidget {
  const HostCallsTab({super.key, required this.jwtToken});
  final String jwtToken;

  @override
  State<HostCallsTab> createState() => _HostCallsTabState();
}

class _HostCallsTabState extends State<HostCallsTab> {
  final _auth = AuthService();
  late Future<List<HostCall>> _future;

  @override
  void initState() {
    super.initState();
    _future = _auth.fetchCalls(token: widget.jwtToken);
  }

  Future<void> _refresh() async {
    setState(() {
      _future = _auth.fetchCalls(token: widget.jwtToken);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: const Text('Calls'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _refresh,
          ),
        ],
      ),
      body: FutureBuilder<List<HostCall>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(
              child: Text('Error: ${snapshot.error}'),
            );
          }
          final calls = snapshot.data ?? [];
          final active = calls.where((c) => c.endedAt == null).toList();
          final ended = calls.where((c) => c.endedAt != null).toList();

          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              children: [
                const ListTile(
                  title: Text('Active'),
                ),
                if (active.isEmpty)
                  const ListTile(
                    title: Text('No active calls'),
                  )
                else
                  ...active.map((c) => ListTile(
                        leading: const Icon(Icons.call),
                        title: Text('Room ${c.id}'),
                        subtitle: Text('Started: ${c.startedAt}'),
                      )),
                const Divider(),
                const ListTile(
                  title: Text('Ended'),
                ),
                if (ended.isEmpty)
                  const ListTile(
                    title: Text('No ended calls'),
                  )
                else
                  ...ended.map((c) => ListTile(
                        leading: const Icon(Icons.history),
                        title: Text('Room ${c.id}'),
                        subtitle:
                            Text('Started: ${c.startedAt}\nEnded: ${c.endedAt}'),
                      )),
              ],
            ),
          );
        },
      ),
    );
  }
}

class HostSettingsTab extends StatelessWidget {
  const HostSettingsTab({super.key, required this.jwtToken, this.hostId});

  final String jwtToken;
  final String? hostId;

  void _logout(BuildContext context) {
    Navigator.popUntil(context, (route) => route.isFirst);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: const Text('Settings'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Profile',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Text('Host ID: ${hostId ?? "Unknown"}'),
            const SizedBox(height: 16),
            Text(
              'Settings',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            const Text('More settings coming soon.'),
            const Spacer(),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => _logout(context),
                child: const Text('Logout'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PlaceholderTab extends StatelessWidget {
  const _PlaceholderTab({
    required this.title,
    required this.message,
  });

  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              title,
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ],
        ),
      ),
    );
  }
}

