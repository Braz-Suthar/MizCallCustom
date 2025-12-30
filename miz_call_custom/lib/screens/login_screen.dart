import 'package:flutter/material.dart';

import '../core/auth.dart';
import '../core/config.dart';
import '../core/session.dart';
import '../core/theme.dart';
import 'host_home_screen.dart';
import 'host_register_screen.dart';
import 'call_screen.dart';
import 'user_dashboard_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _auth = AuthService();

  final _idController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _idController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  bool _isValidHostId(String value) => RegExp(r'^H\d{6}$').hasMatch(value.trim());
  bool _isValidUserId(String value) => RegExp(r'^U\d{6}$').hasMatch(value.trim());

  Future<void> _login() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      late final String token;
      final id = _idController.text.trim();
      final password = _passwordController.text;

      // If a session already exists, log it
      final existing = await Session.load();
      if (existing != null) {
        debugPrint(
            "[Login] existing session token=${existing.token.substring(0, 8)}... role=${existing.role} hostId=${existing.hostId ?? 'unknown'}");
      }

      if (!_isValidHostId(id) && !_isValidUserId(id)) {
        throw Exception('ID must start with H or U followed by 6 digits');
      }

      String? hostId;
      if (id.startsWith('H')) {
        hostId = id;
        token = await _auth.loginHost(hostId);
        await Session.save(token: token, role: 'host', hostId: hostId);
      } else {
        if (password.isEmpty) {
          throw Exception('Password required for user login');
        }
        final result = await _auth.loginUser(id, password);
        token = result.token;
        hostId = result.hostId;
        debugPrint("[Login] user login success userId=$id hostId=${hostId ?? 'unknown'}");
        await Session.save(token: token, role: 'user', hostId: hostId);
      }

      if (!mounted) return;
      if (id.startsWith('H')) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => HostHomeScreen(
              jwtToken: token,
              hostId: hostId,
            ),
          ),
        );
      } else {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => UserDashboardScreen(
              jwtToken: token,
              wsUrl: defaultWsUrl,
            ),
          ),
        );
      }
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
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 24),
              Text(
                'Welcome back',
                style: Theme.of(context)
                    .textTheme
                    .headlineSmall
                    ?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 6),
              const SizedBox(height: 24),
              TextField(
                controller: _idController,
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
              const SizedBox(height: 16),
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(
                    _error!,
                    style: const TextStyle(color: Colors.redAccent),
                  ),
                ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: appleBlue,
                    minimumSize: const Size.fromHeight(48),
                  ),
                  onPressed: _loading ? null : _login,
                  child: _loading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text(
                          'Login',
                          style: TextStyle(color: Colors.white),
                        ),
                ),
              ),
              const SizedBox(height: 12),
              Center(
                child: TextButton(
                  onPressed: _loading
                      ? null
                      : () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const HostRegisterScreen(),
                            ),
                          );
                        },
                  child: Text(
                    "Don't have a Host Account ? Create Account",
                    style: TextStyle(color: appleBlue),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
