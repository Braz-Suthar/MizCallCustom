import 'package:flutter/material.dart';
import 'core/theme.dart';
import 'screens/splash_screen.dart';

class MizCallCustomApp extends StatelessWidget {
  const MizCallCustomApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ThemeMode>(
      valueListenable: ThemeController.instance.mode,
      builder: (context, mode, _) {
        return MaterialApp(
          title: 'MizCallCustom',
          debugShowCheckedModeBanner: false,
          theme: buildLightTheme(),
          darkTheme: buildDarkTheme(),
          themeMode: mode,
          home: const SplashScreen(),
        );
      },
    );
  }
}
