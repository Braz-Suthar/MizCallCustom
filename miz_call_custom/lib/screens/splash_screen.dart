import 'package:flutter/material.dart';

import '../core/session.dart';
import 'call_screen.dart';
import 'host_home_screen.dart';
import 'intro_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    final session = await Session.load();
    if (!mounted) return;

    if (session != null) {
      if (session.role == 'host') {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => HostHomeScreen(
              jwtToken: session.token,
              hostId: session.hostId,
            ),
          ),
        );
        return;
      } else {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => CallScreen(
              jwtToken: session.token,
              wsUrl: session.hostId ?? '', // hostId unused for users
            ),
          ),
        );
        return;
      }
    }

    await Future.delayed(const Duration(milliseconds: 800));
    if (!mounted) return;
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (_) => const IntroScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final color = Theme.of(context).colorScheme.primary;
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.wifi_calling_3_rounded, size: 72, color: color),
            const SizedBox(height: 16),
            const Text(
              'MizCall',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            const CircularProgressIndicator(),
          ],
        ),
      ),
    );
  }
}

