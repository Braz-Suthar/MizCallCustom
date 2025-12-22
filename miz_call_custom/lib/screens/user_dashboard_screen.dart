import 'package:flutter/material.dart';

import 'dart:convert';

import '../core/auth.dart';
import '../core/config.dart';
import '../core/session.dart';
import '../core/theme.dart';
import '../signaling/signaling_client.dart';
import 'call_screen.dart';
import 'intro_screen.dart';

class UserDashboardScreen extends StatefulWidget {
  const UserDashboardScreen({
    super.key,
    required this.jwtToken,
    this.wsUrl = defaultWsUrl,
  });

  final String jwtToken;
  final String wsUrl;

  @override
  State<UserDashboardScreen> createState() => _UserDashboardScreenState();
}

class _UserDashboardScreenState extends State<UserDashboardScreen> {
  int _index = 0;
  SignalingClient? _signaling;
  bool _navigatingToCall = false;

  late final List<_TabSpec> _tabs = [
    _TabSpec(
      label: 'Dashboard',
      icon: Icons.dashboard_outlined,
      builder: () => UserDashboardTab(
        jwtToken: widget.jwtToken,
        wsUrl: widget.wsUrl,
      ),
    ),
    _TabSpec(
      label: 'Recordings',
      icon: Icons.library_music_outlined,
      builder: () => UserRecordingsTab(jwtToken: widget.jwtToken),
    ),
    _TabSpec(
      label: 'Settings',
      icon: Icons.settings_outlined,
      builder: () => UserSettingsTab(jwtToken: widget.jwtToken),
    ),
  ];

  @override
  Widget build(BuildContext context) {
    // kick off signaling connection lazily
    _ensureSignaling();

    return Scaffold(
      body: SafeArea(
        child: IndexedStack(
          index: _index,
          children: _tabs.map((t) => t.builder()).toList(),
        ),
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _index,
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

  void _ensureSignaling() {
    if (_signaling != null) return;
    final client = SignalingClient(widget.wsUrl);
    _signaling = client;
    client.stream.listen(_onSignal, onError: (_) {});
    client.send({
      "type": "auth",
      "token": widget.jwtToken,
    });
  }

  void _onSignal(dynamic raw) {
    try {
      final msg = jsonDecode(raw as String);
      switch (msg["type"]) {
        case "call-started":
        case "CALL_STARTED":
          _goToCall();
          break;
        case "call-stopped":
        case "CALL_STOPPED":
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text("Call ended by host")),
            );
          }
          break;
        default:
          break;
      }
    } catch (_) {
      // ignore malformed messages
    }
  }

  void _goToCall() {
    if (_navigatingToCall) return;
    _navigatingToCall = true;
    if (!mounted) return;
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => CallScreen(
          jwtToken: widget.jwtToken,
          wsUrl: widget.wsUrl,
        ),
      ),
    ).whenComplete(() {
      _navigatingToCall = false;
    });
  }

  @override
  void dispose() {
    _signaling?.close();
    super.dispose();
  }
}

class UserDashboardTab extends StatelessWidget {
  const UserDashboardTab({
    super.key,
    required this.jwtToken,
    required this.wsUrl,
  });

  final String jwtToken;
  final String wsUrl;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 16),
          Text(
            'Dashboard',
            style: Theme.of(context)
                .textTheme
                .headlineSmall
                ?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          Text(
            'Join the live call and participate.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: appleBlue,
                minimumSize: const Size.fromHeight(48),
              ),
              icon: const Icon(Icons.call),
              label: const Text('Join Call'),
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => CallScreen(
                      jwtToken: jwtToken,
                      wsUrl: wsUrl,
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class UserRecordingsTab extends StatefulWidget {
  const UserRecordingsTab({super.key, required this.jwtToken});

  final String jwtToken;

  @override
  State<UserRecordingsTab> createState() => _UserRecordingsTabState();
}

class _UserRecordingsTabState extends State<UserRecordingsTab> {
  final _auth = AuthService();
  bool _loading = true;
  String? _error;
  List<UserRecordingGroup> _groups = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await _auth.fetchUserRecordings(token: widget.jwtToken);
      if (!mounted) return;
      setState(() => _groups = data);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _fmtTime(DateTime dt) {
    final h = dt.hour.toString().padLeft(2, '0');
    final m = dt.minute.toString().padLeft(2, '0');
    final s = dt.second.toString().padLeft(2, '0');
    return '$h:$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              _error!,
              style: const TextStyle(color: Colors.redAccent),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: _load,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (_groups.isEmpty) {
      return const Center(
        child: Text('No recordings yet.'),
      );
    }

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _groups.length,
        itemBuilder: (context, i) {
          final group = _groups[i];
          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    group.date,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 8),
                  ...group.recordings.map((r) {
                    final start = _fmtTime(r.startTime.toLocal());
                    final end = r.endTime != null ? _fmtTime(r.endTime!.toLocal()) : null;
                    final subtitle = end != null ? '$start - $end' : start;
                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: const Icon(Icons.music_note),
                      title: Text('Recording ${r.id}'),
                      subtitle: Text(subtitle),
                      trailing: r.filePath != null
                          ? const Icon(Icons.cloud_download_outlined)
                          : null,
                    );
                  }).toList(),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class UserSettingsTab extends StatefulWidget {
  const UserSettingsTab({super.key, required this.jwtToken});

  final String jwtToken;

  @override
  State<UserSettingsTab> createState() => _UserSettingsTabState();
}

class _UserSettingsTabState extends State<UserSettingsTab> {
  bool _loggingOut = false;

  Future<void> _logout() async {
    setState(() => _loggingOut = true);
    await Session.clear();
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const IntroScreen()),
      (_) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 16),
          Text(
            'Settings',
            style: Theme.of(context)
                .textTheme
                .headlineSmall
                ?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.redAccent,
                minimumSize: const Size.fromHeight(48),
              ),
              icon: const Icon(Icons.logout),
              label: Text(_loggingOut ? 'Logging out...' : 'Logout'),
              onPressed: _loggingOut ? null : _logout,
            ),
          ),
        ],
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

