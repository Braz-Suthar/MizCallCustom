import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../core/auth.dart';
import '../core/config.dart';
import '../core/theme.dart';
import '../core/session.dart';
import 'host_dashboard_screen.dart';
import 'call_screen.dart';

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
        showSelectedLabels: false,
        showUnselectedLabels: false,
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
  final _searchController = TextEditingController();
  List<HostUser> _users = const [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
    _searchController.addListener(_onSearchChanged);
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged() {
    setState(() {});
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await _auth.fetchUsers(token: widget.jwtToken);
      if (!mounted) return;
      setState(() {
        _users = data;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _refresh() async {
    await _load();
  }

  Future<void> _addUser() async {
    String username = '';
    String password = '';
    bool active = true;
    bool useCustomPassword = false;
    final formKey = GlobalKey<FormState>();

    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: true,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Dialog(
              backgroundColor: Theme.of(context).colorScheme.surface,
              shape:
                  RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Form(
                  key: formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Create User',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          IconButton(
                            onPressed: () => Navigator.pop(ctx, false),
                            icon: const Icon(Icons.close),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      const Text('Full Name'),
                      const SizedBox(height: 8),
                      TextFormField(
                        decoration: const InputDecoration(
                          hintText: "Enter user's full name",
                        ),
                        onChanged: (v) => username = v,
                        validator: (v) =>
                            v == null || v.trim().isEmpty ? 'Required' : null,
                      ),
                      const SizedBox(height: 16),
                      SwitchListTile(
                        contentPadding: EdgeInsets.zero,
                        title: const Text('Active Status'),
                        value: active,
                        onChanged: (v) => setModalState(() => active = v),
                      ),
                      SwitchListTile(
                        contentPadding: EdgeInsets.zero,
                        title: const Text('Use Custom Password'),
                        value: useCustomPassword,
                        onChanged: (v) =>
                            setModalState(() => useCustomPassword = v),
                      ),
                      if (useCustomPassword) ...[
                        const SizedBox(height: 8),
                        const Text('Password'),
                        const SizedBox(height: 8),
                        TextFormField(
                          decoration: const InputDecoration(
                            hintText: 'Enter custom password',
                          ),
                          onChanged: (v) => password = v,
                          validator: (v) {
                            if (!useCustomPassword) return null;
                            return (v == null || v.isEmpty)
                                ? 'Password required'
                                : null;
                          },
                        ),
                      ],
                      const SizedBox(height: 20),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
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
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );

    if (result != true) return;

    final created = await _auth.createUser(
      token: widget.jwtToken,
      username: username.trim(),
      password: useCustomPassword && password.trim().isNotEmpty
          ? password.trim()
          : null,
    );

    if (!active) {
      await _auth.setUserEnabled(
        token: widget.jwtToken,
        userId: created.userId,
        enabled: false,
      );
    }

    // Show details modal
    if (mounted) {
      await _showUserDetails(
        HostUser(
          id: created.userId,
          username: username.trim(),
          enabled: active,
          lastSpeaking: null,
        ),
        password: created.password,
      );
    }

    // Re-fetch to get fresh list and the created user ID
    if (mounted) await _refresh();
  }

  List<HostUser> get _filteredUsers {
    final q = _searchController.text.trim().toLowerCase();
    if (q.isEmpty) return _users;
    return _users
        .where((u) =>
            u.id.toLowerCase().contains(q) ||
            u.username.toLowerCase().contains(q))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final users = _filteredUsers;
    return Scaffold(
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    decoration: const InputDecoration(
                      prefixIcon: Icon(Icons.search),
                      hintText: 'Search users...',
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                IconButton(
                  onPressed: () {},
                  icon: const Icon(Icons.filter_list),
                )
              ],
            ),
            const SizedBox(height: 16),
            _headerRow(),
            if (_loading)
              const Padding(
                padding: EdgeInsets.all(16),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_error != null)
              Padding(
                padding: const EdgeInsets.all(16),
                child: Text('Error: $_error'),
              )
            else if (users.isEmpty)
              const Padding(
                padding: EdgeInsets.all(16),
                child: Text('No users found'),
              )
            else
              ...users.map((u) => _userRow(u)),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _addUser,
        child: const Icon(Icons.person_add_alt_1),
      ),
    );
  }

  Widget _headerRow() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: const [
          Expanded(flex: 2, child: Text('USER ID')),
          Expanded(flex: 3, child: Text('NAME')),
          Expanded(flex: 2, child: Text('STATUS')),
          Expanded(flex: 1, child: Text('ACTIONS')),
        ],
      ),
    );
  }

  Widget _userRow(HostUser user) {
    return InkWell(
      onTap: () => _showUserDetails(user),
      child: Container(
        margin: const EdgeInsets.only(top: 8),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          children: [
            Expanded(
              flex: 2,
              child: Text(
                user.id,
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
            ),
            Expanded(
              flex: 3,
              child: Text(user.username.isEmpty ? '-' : user.username),
            ),
            Expanded(
              flex: 2,
              child: Align(
                alignment: Alignment.centerLeft,
                child: _statusChip(user.enabled ? 'Active' : 'Disabled',
                    user.enabled ? Colors.green : Colors.red),
              ),
            ),
            Expanded(
              flex: 1,
              child: Align(
                alignment: Alignment.centerLeft,
                child: PopupMenuButton<String>(
                  icon: const Icon(Icons.more_horiz),
                  onSelected: (value) {
                    switch (value) {
                      case 'details':
                        _showUserDetails(user);
                        break;
                      case 'edit':
                        _editUser(user);
                        break;
                      case 'delete':
                        _confirmDelete(user);
                        break;
                    }
                  },
                  itemBuilder: (ctx) => [
                    const PopupMenuItem(
                      value: 'details',
                      child: Text('View details'),
                    ),
                    const PopupMenuItem(
                      value: 'edit',
                      child: Text('Edit'),
                    ),
                    const PopupMenuItem(
                      value: 'delete',
                      child: Text('Delete'),
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

  Widget _statusChip(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Future<void> _showUserDetails(HostUser user, {String? password}) async {
    final pwd = password ?? '—';
    await showDialog<void>(
      context: context,
      barrierDismissible: true,
      builder: (ctx) {
        return Dialog(
          backgroundColor: Theme.of(context).colorScheme.surface,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Align(
                  alignment: Alignment.topRight,
                  child: IconButton(
                    onPressed: () => Navigator.pop(ctx),
                    icon: const Icon(Icons.close),
                  ),
                ),
                const SizedBox(height: 4),
                Container(
                  height: 52,
                  width: 52,
                  decoration: BoxDecoration(
                    color: Colors.green.withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.check,
                    color: Colors.green,
                    size: 30,
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'User Details',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  user.username.isEmpty ? '-' : user.username,
                  style: const TextStyle(fontSize: 16),
                ),
                const SizedBox(height: 16),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surface,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _detailRow(
                        label: 'User ID',
                        value: user.id,
                        onCopy: () => _copyText(user.id),
                      ),
                      const SizedBox(height: 12),
                      _detailRow(
                        label: 'Password',
                        value: pwd,
                        onCopy: () => _copyText(pwd),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () => _copyText(
                      'User ID: ${user.id}\nName: ${user.username}\nPassword: $pwd',
                    ),
                    icon: const Icon(Icons.copy_outlined),
                    label: const Text('Copy All Details'),
                    style: ElevatedButton.styleFrom(
                      minimumSize: const Size.fromHeight(48),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _detailRow({
    required String label,
    required String value,
    required VoidCallback onCopy,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: const TextStyle(color: Colors.white54),
            ),
            const SizedBox(height: 4),
            Text(
              value,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        IconButton(
          onPressed: onCopy,
          icon: const Icon(Icons.copy_outlined),
        ),
      ],
    );
  }

  Future<void> _copyText(String text) async {
    await Clipboard.setData(ClipboardData(text: text));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Copied')),
    );
  }

  Future<void> _confirmDelete(HostUser user) async {
    final shouldDelete = await showDialog<bool>(
      context: context,
      barrierDismissible: true,
      builder: (ctx) {
        return Dialog(
          backgroundColor: Theme.of(context).colorScheme.surface,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Align(
                  alignment: Alignment.topRight,
                  child: IconButton(
                    onPressed: () => Navigator.pop(ctx, false),
                    icon: const Icon(Icons.close),
                  ),
                ),
                const SizedBox(height: 4),
                Container(
                  height: 52,
                  width: 52,
                  decoration: BoxDecoration(
                    color: Colors.red.withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.warning_amber_rounded,
                    color: Colors.redAccent,
                    size: 30,
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Delete User',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Are you sure you want to delete this user? This action cannot be undone.',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.redAccent,
                      minimumSize: const Size.fromHeight(48),
                    ),
                    onPressed: () => Navigator.pop(ctx, true),
                    child: const Text('Delete'),
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size.fromHeight(48),
                    ),
                    onPressed: () => Navigator.pop(ctx, false),
                    child: const Text('Cancel'),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );

    if (shouldDelete != true) return;

    try {
      await _auth.deleteUser(token: widget.jwtToken, userId: user.id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('User deleted')),
      );
      await _refresh();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Delete failed: $e')),
      );
    }
  }

  Future<void> _editUser(HostUser user) async {
    bool active = user.enabled;
    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: true,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Dialog(
              backgroundColor: Theme.of(context).colorScheme.surface,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Edit User',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        IconButton(
                          onPressed: () => Navigator.pop(ctx, false),
                          icon: const Icon(Icons.close),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(user.username.isEmpty ? user.id : user.username),
                    const SizedBox(height: 12),
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Active Status'),
                      value: active,
                      onChanged: (v) => setModalState(() => active = v),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        TextButton(
                          onPressed: () => Navigator.pop(ctx, false),
                          child: const Text('Cancel'),
                        ),
                        ElevatedButton(
                          onPressed: () => Navigator.pop(ctx, true),
                          child: const Text('Save'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );

    if (result != true) return;

    await _auth.setUserEnabled(
      token: widget.jwtToken,
      userId: user.id,
      enabled: active,
    );
    await _refresh();
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
  final _searchController = TextEditingController();
  List<HostCall> _calls = const [];
  bool _loading = true;
  String? _busyId;

  @override
  void initState() {
    super.initState();
    _load();
    _searchController.addListener(_onSearchChanged);
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged() {
    setState(() {}); // re-run filter
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await _auth.fetchCalls(token: widget.jwtToken);
      if (!mounted) return;
      setState(() {
        _calls = data;
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _refresh() async {
    await _load();
  }

  Future<void> _endCall(String callId) async {
    setState(() => _busyId = callId);
    try {
      await _auth.endCall(token: widget.jwtToken, callId: callId);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Call ended')),
      );
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to end call: $e')),
      );
    } finally {
      if (mounted) setState(() => _busyId = null);
    }
  }

  Future<void> _startCall() async {
    try {
      final roomId = await _auth.startHostCall(token: widget.jwtToken);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Call started (room $roomId)')),
      );
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => CallScreen(
            jwtToken: widget.jwtToken,
            wsUrl: defaultWsUrl,
          ),
        ),
      );
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to start call: $e')),
      );
    }
  }

  List<HostCall> get _filteredCalls {
    final q = _searchController.text.trim().toLowerCase();
    if (q.isEmpty) return _calls;
    return _calls
        .where((c) =>
            c.id.toLowerCase().contains(q) ||
            c.status.toLowerCase().contains(q))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final calls = _filteredCalls;
    return Scaffold(
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    decoration: const InputDecoration(
                      prefixIcon: Icon(Icons.search),
                      hintText: 'Search calls...',
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                IconButton(
                  onPressed: () {},
                  icon: const Icon(Icons.filter_list),
                )
              ],
            ),
            const SizedBox(height: 16),
            if (_loading)
              const Center(child: Padding(
                padding: EdgeInsets.all(16),
                child: CircularProgressIndicator(),
              ))
            else if (calls.isEmpty)
              const Padding(
                padding: EdgeInsets.all(16),
                child: Text('No calls found'),
              )
            else
              ...List.generate(calls.length, (index) {
                final c = calls[index];
                final status = c.endedAt == null ? 'active' : 'ended';
                return _callCard(
                  index: index + 1,
                  call: c,
                  status: status,
                );
              }),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _startCall,
        child: const Icon(Icons.add_call),
      ),
    );
  }

  Widget _callCard({
    required int index,
    required HostCall call,
    required String status,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('#$index', style: const TextStyle(color: Colors.white70)),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: status == 'active'
                      ? Colors.green.withValues(alpha: 0.2)
                      : Colors.grey.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  status,
                  style: TextStyle(
                    color: status == 'active'
                        ? Colors.greenAccent
                        : Colors.white70,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Text(
            'MEETING ID',
            style: TextStyle(color: Colors.white54, letterSpacing: 0.5),
          ),
          Text(
            call.id,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('START', style: TextStyle(color: Colors.white54)),
                  Text(call.startedAt),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('END', style: TextStyle(color: Colors.white54)),
                  Text(call.endedAt ?? '-'),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: const [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('PARTICIPANTS', style: TextStyle(color: Colors.white54)),
                  Text('-'),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('RECORDING', style: TextStyle(color: Colors.white54)),
                  Text('-'),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  icon: const Icon(Icons.call),
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => CallScreen(
                          jwtToken: widget.jwtToken,
                          wsUrl: defaultWsUrl,
                        ),
                      ),
                    );
                  },
                  label: const Text('Join'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton.icon(
                  icon: const Icon(Icons.call_end, color: Colors.red),
                  onPressed: status == 'active' && _busyId != call.id
                      ? () => _endCall(call.id)
                      : null,
                  label: _busyId == call.id
                      ? const SizedBox(
                          height: 16,
                          width: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text(
                          'End',
                          style: TextStyle(color: Colors.red),
                        ),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Colors.red),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class HostSettingsTab extends StatelessWidget {
  const HostSettingsTab({super.key, required this.jwtToken, this.hostId});

  final String jwtToken;
  final String? hostId;

  void _logout(BuildContext context) {
    Session.clear();
    Navigator.popUntil(context, (route) => route.isFirst);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.redAccent,
                minimumSize: const Size.fromHeight(44),
              ),
              onPressed: () => _logout(context),
              child: const Text('Logout'),
            ),
          ),
          const SizedBox(height: 16),
          _card(
            context,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: const [
                    Icon(Icons.person_outline),
                    SizedBox(width: 8),
                    Text(
                      'Host Information',
                      style: TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Center(
                  child: CircleAvatar(
                    radius: 48,
                    backgroundColor: Theme.of(context).colorScheme.surface,
                    child: const Icon(Icons.person, size: 48),
                  ),
                ),
                const SizedBox(height: 16),
                _infoRow(
                  icon: Icons.badge_outlined,
                  label: 'Name',
                  value: 'Host',
                ),
                const SizedBox(height: 12),
                _infoRow(
                  icon: Icons.mail_outline,
                  label: 'Email',
                  value: 'host@example.com',
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Update password tapped')),
                      );
                    },
                    child: const Text('Update Password'),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          _card(
            context,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: const [
                    Icon(Icons.receipt_long_outlined),
                    SizedBox(width: 8),
                    Text(
                      'Subscription Details',
                      style: TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                _infoRow(
                  icon: Icons.event_seat_outlined,
                  label: 'Plan',
                  value: 'Basic',
                ),
                const SizedBox(height: 12),
                _infoRow(
                  icon: Icons.check_circle_outline,
                  label: 'Status',
                  value: 'Active',
                  valueColor: Colors.green,
                ),
                const SizedBox(height: 12),
                _infoRow(
                  icon: Icons.date_range_outlined,
                  label: 'Start Date',
                  value: '12/06/2025',
                ),
                const SizedBox(height: 12),
                _infoRow(
                  icon: Icons.event_busy_outlined,
                  label: 'End Date',
                  value: '19/06/2026',
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          _card(
            context,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: const [
                    Icon(Icons.image_outlined),
                    SizedBox(width: 8),
                    Text(
                      'Call Page Background',
                      style: TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Dark Mode'),
                    ValueListenableBuilder(
                      valueListenable: ThemeController.instance.mode,
                      builder: (context, mode, _) {
                        return Switch(
                          value: mode == ThemeMode.dark,
                          onChanged: (v) =>
                              ThemeController.instance.toggle(v),
                        );
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                const Text('Laptop Preview'),
                const SizedBox(height: 8),
                _previewBox(context, height: 120),
                const SizedBox(height: 16),
                const Text('Mobile Preview'),
                const SizedBox(height: 8),
                _previewBox(context, height: 140, width: 90),
                const SizedBox(height: 16),
                const Text('Choose your background:'),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _thumbBox(context, label: 'Wave'),
                    _thumbBox(context, label: 'Sunset'),
                    _thumbBox(context, label: 'Blue'),
                    _thumbBox(context, label: 'Custom', add: true),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                                content: Text('Background removed')),
                          );
                        },
                        child: const Text('Remove Background'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                                content: Text('Background saved')),
                          );
                        },
                        child: const Text('Save Background'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _card(BuildContext context, {required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
      ),
      child: child,
    );
  }

  Widget _infoRow({
    required IconData icon,
    required String label,
    required String value,
    Color? valueColor,
  }) {
    return Row(
      children: [
        Icon(icon, color: Colors.white70),
        const SizedBox(width: 8),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(color: Colors.white70)),
            const SizedBox(height: 4),
            Text(
              value,
              style: TextStyle(
                fontWeight: FontWeight.w600,
                color: valueColor ?? Colors.white,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _previewBox(BuildContext context,
      {double? width, required double height}) {
    return Container(
      width: width ?? double.infinity,
      height: height,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(10),
      ),
      child: const Center(child: Icon(Icons.image, size: 32)),
    );
  }

  Widget _thumbBox(BuildContext context, {required String label, bool add = false}) {
    return Container(
      width: 70,
      height: 44,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Theme.of(context).dividerColor),
      ),
      child: Center(
        child: add
            ? const Icon(Icons.add, color: Colors.white)
            : Text(
                label,
                style: const TextStyle(fontSize: 10),
                textAlign: TextAlign.center,
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

