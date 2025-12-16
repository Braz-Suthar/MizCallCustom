import 'package:flutter/material.dart';

import '../core/auth.dart';
import '../core/config.dart';
import 'call_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _auth = AuthService();

  final _hostIdController = TextEditingController();
  final _userIdController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _isHost = true;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _hostIdController.dispose();
    _userIdController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      late final String token;
      if (_isHost) {
        final hostId = _hostIdController.text.trim();
        if (hostId.isEmpty) throw Exception('Host ID required');
        token = await _auth.loginHost(hostId);
      } else {
        final userId = _userIdController.text.trim();
        final password = _passwordController.text;
        if (userId.isEmpty || password.isEmpty) {
          throw Exception('User ID and password required');
        }
        token = await _auth.loginUser(userId, password);
      }

      if (!mounted) return;
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => CallScreen(
            jwtToken: token,
            wsUrl: defaultWsUrl,
          ),
        ),
      );
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Login')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ToggleButtons(
              isSelected: [_isHost, !_isHost],
              onPressed: (index) {
                setState(() {
                  _isHost = index == 0;
                  _error = null;
                });
              },
              children: const [
                Padding(
                  padding: EdgeInsets.symmetric(horizontal: 12),
                  child: Text('Host'),
                ),
                Padding(
                  padding: EdgeInsets.symmetric(horizontal: 12),
                  child: Text('User'),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (_isHost) ...[
              TextField(
                controller: _hostIdController,
                decoration: const InputDecoration(
                  labelText: 'Host ID',
                ),
              ),
            ] else ...[
              TextField(
                controller: _userIdController,
                decoration: const InputDecoration(
                  labelText: 'User ID',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _passwordController,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Password',
                ),
              ),
            ],
            const SizedBox(height: 16),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(
                  _error!,
                  style: const TextStyle(color: Colors.redAccent),
                ),
              ),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _loading ? null : _login,
                child: _loading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text(_isHost ? 'Login as Host' : 'Login as User'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
