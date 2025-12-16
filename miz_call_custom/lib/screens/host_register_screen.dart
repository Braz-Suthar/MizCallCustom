import 'package:flutter/material.dart';

import '../core/auth.dart';
import '../core/config.dart';
import 'call_screen.dart';

class HostRegisterScreen extends StatefulWidget {
  const HostRegisterScreen({super.key});

  @override
  State<HostRegisterScreen> createState() => _HostRegisterScreenState();
}

class _HostRegisterScreenState extends State<HostRegisterScreen> {
  final _auth = AuthService();
  final _nameController = TextEditingController();

  bool _loading = false;
  String? _error;
  String? _hostId;

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _register() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final name = _nameController.text.trim();
      if (name.isEmpty) {
        throw Exception('Name is required');
      }

      final result = await _auth.registerHost(name);
      _hostId = result.hostId;

      if (!mounted) return;
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (_) => CallScreen(
            jwtToken: result.token,
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
      appBar: AppBar(title: const Text('Register Host')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Host name',
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
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _loading ? null : _register,
                child: _loading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Register & Join'),
              ),
            ),
            if (_hostId != null)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Text(
                  'Your Host ID: $_hostId',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

