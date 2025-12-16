import 'package:flutter/material.dart';

const Color appleBlue = Color(0xFF0A84FF);

class ThemeController {
  ThemeController._();
  static final ThemeController instance = ThemeController._();

  final ValueNotifier<ThemeMode> mode = ValueNotifier(ThemeMode.dark);

  void toggle(bool isDark) {
    mode.value = isDark ? ThemeMode.dark : ThemeMode.light;
  }
}

ThemeData buildLightTheme() {
  return ThemeData(
    brightness: Brightness.light,
    scaffoldBackgroundColor: Colors.white,
    colorScheme: ColorScheme.light(
      primary: appleBlue,
      secondary: appleBlue,
      surface: Colors.grey.shade100,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.white,
      foregroundColor: Colors.black,
      elevation: 0,
    ),
  );
}

ThemeData buildDarkTheme() {
  return ThemeData(
    brightness: Brightness.dark,
    scaffoldBackgroundColor: Colors.black,
    colorScheme: const ColorScheme.dark(
      primary: appleBlue,
      secondary: appleBlue,
      surface: Color(0xFF121212),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Color(0xFF0D0D0D),
      foregroundColor: Colors.white,
      elevation: 0,
    ),
  );
}

