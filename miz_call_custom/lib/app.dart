import 'package:flutter/material.dart';
import 'screens/login_screen.dart';

class MizCallCustomApp extends StatelessWidget {
  const MizCallCustomApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MizCallCustom',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark(),
      home: const LoginScreen(),
    );
  }
}
