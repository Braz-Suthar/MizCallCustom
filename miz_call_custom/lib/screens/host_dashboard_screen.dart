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

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (widget.hostId != null)
            Text(
              'Host ID: ${widget.hostId}',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          const SizedBox(height: 16),
          Text(
            'Quick actions',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _busy ? null : _startCall,
                  icon: const Icon(Icons.call),
                  label: const Text('Start call'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _busy ? null : _createUser,
                  icon: const Icon(Icons.person_add_alt_1),
                  label: const Text('Add user'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            'Add user',
            style: Theme.of(context).textTheme.titleMedium,
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
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: _busy ? null : _startCall,
              child: const Text('Start new call'),
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
}

