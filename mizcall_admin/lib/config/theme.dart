import 'package:flutter/material.dart';

class AppTheme {
  // Colors
  static const Color primaryBlue = Color(0xFF3B82F6);
  static const Color secondaryBlue = Color(0xFF60A5FA);
  static const Color successGreen = Color(0xFF22C55E);
  static const Color dangerRed = Color(0xFFEF4444);
  static const Color warningOrange = Color(0xFFF59E0B);
  
  // Light Theme Colors
  static const Color lightBackground = Color(0xFFF3F4F6);
  static const Color lightCard = Color(0xFFFFFFFF);
  static const Color lightText = Color(0xFF0F172A);
  static const Color lightTextSecondary = Color(0xFF64748B);
  static const Color lightBorder = Color(0xFFE5E7EB);
  
  // Dark Theme Colors
  static const Color darkBackground = Color(0xFF0F172A);
  static const Color darkCard = Color(0xFF1E293B);
  static const Color darkText = Color(0xFFF1F5F9);
  static const Color darkTextSecondary = Color(0xFF94A3B8);
  static const Color darkBorder = Color(0xFF334155);

  static ThemeData lightTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    primaryColor: primaryBlue,
    scaffoldBackgroundColor: lightBackground,
    colorScheme: const ColorScheme.light(
      primary: primaryBlue,
      secondary: secondaryBlue,
      error: dangerRed,
      surface: lightCard,
      onPrimary: Colors.white,
      onSecondary: Colors.white,
      onSurface: lightText,
      onError: Colors.white,
    ),
    cardTheme: CardThemeData(
      color: lightCard,
      elevation: 2,
      shadowColor: Colors.black.withOpacity(0.08),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: lightBorder, width: 1),
      ),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: lightCard,
      foregroundColor: lightText,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        color: lightText,
        fontSize: 20,
        fontWeight: FontWeight.w700,
      ),
    ),
    textTheme: const TextTheme(
      displayLarge: TextStyle(color: lightText, fontSize: 32, fontWeight: FontWeight.bold),
      displayMedium: TextStyle(color: lightText, fontSize: 28, fontWeight: FontWeight.bold),
      displaySmall: TextStyle(color: lightText, fontSize: 24, fontWeight: FontWeight.bold),
      headlineMedium: TextStyle(color: lightText, fontSize: 20, fontWeight: FontWeight.w700),
      titleLarge: TextStyle(color: lightText, fontSize: 18, fontWeight: FontWeight.w600),
      titleMedium: TextStyle(color: lightText, fontSize: 16, fontWeight: FontWeight.w600),
      bodyLarge: TextStyle(color: lightText, fontSize: 15),
      bodyMedium: TextStyle(color: lightText, fontSize: 14),
      bodySmall: TextStyle(color: lightTextSecondary, fontSize: 13),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: lightBackground,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: lightBorder, width: 1),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: lightBorder, width: 1),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: primaryBlue, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: dangerRed, width: 1),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primaryBlue,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        elevation: 2,
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
      ),
    ),
  );

  static ThemeData darkTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    primaryColor: primaryBlue,
    scaffoldBackgroundColor: darkBackground,
    colorScheme: const ColorScheme.dark(
      primary: primaryBlue,
      secondary: secondaryBlue,
      error: dangerRed,
      surface: darkCard,
      onPrimary: Colors.white,
      onSecondary: Colors.white,
      onSurface: darkText,
      onError: Colors.white,
    ),
    cardTheme: CardThemeData(
      color: darkCard,
      elevation: 2,
      shadowColor: Colors.black.withOpacity(0.3),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: darkBorder, width: 1),
      ),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: darkCard,
      foregroundColor: darkText,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        color: darkText,
        fontSize: 20,
        fontWeight: FontWeight.w700,
      ),
    ),
    textTheme: const TextTheme(
      displayLarge: TextStyle(color: darkText, fontSize: 32, fontWeight: FontWeight.bold),
      displayMedium: TextStyle(color: darkText, fontSize: 28, fontWeight: FontWeight.bold),
      displaySmall: TextStyle(color: darkText, fontSize: 24, fontWeight: FontWeight.bold),
      headlineMedium: TextStyle(color: darkText, fontSize: 20, fontWeight: FontWeight.w700),
      titleLarge: TextStyle(color: darkText, fontSize: 18, fontWeight: FontWeight.w600),
      titleMedium: TextStyle(color: darkText, fontSize: 16, fontWeight: FontWeight.w600),
      bodyLarge: TextStyle(color: darkText, fontSize: 15),
      bodyMedium: TextStyle(color: darkText, fontSize: 14),
      bodySmall: TextStyle(color: darkTextSecondary, fontSize: 13),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: darkBackground,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: darkBorder, width: 1),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: darkBorder, width: 1),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: primaryBlue, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: dangerRed, width: 1),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primaryBlue,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        elevation: 2,
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
      ),
    ),
  );
}
