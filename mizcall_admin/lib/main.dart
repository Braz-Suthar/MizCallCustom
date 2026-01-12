import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:window_manager/window_manager.dart';
import 'dart:io';

import 'config/app_config.dart';
import 'config/theme.dart';
import 'config/routes.dart';
import 'services/auth_service.dart';
import 'services/api_service.dart';
import 'services/host_service.dart';
import 'services/websocket_service.dart';
import 'services/export_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize desktop window settings
  if (Platform.isWindows || Platform.isLinux || Platform.isMacOS) {
    await windowManager.ensureInitialized();
    
    WindowOptions windowOptions = const WindowOptions(
      size: Size(1400, 900),
      minimumSize: Size(1200, 700),
      center: true,
      backgroundColor: Colors.transparent,
      skipTaskbar: false,
      titleBarStyle: TitleBarStyle.normal,
      title: 'MizCall Admin',
    );
    
    await windowManager.waitUntilReadyToShow(windowOptions, () async {
      await windowManager.show();
      await windowManager.focus();
    });
  }
  
  // Initialize shared preferences
  final prefs = await SharedPreferences.getInstance();
  
  // Initialize API service
  final apiService = ApiService();
  
  // Initialize auth service
  final authService = AuthService(apiService: apiService, prefs: prefs);
  
  // Initialize host service
  final hostService = HostService(apiService: apiService);
  
  // Initialize WebSocket service
  final websocketService = WebSocketService();
  
  // Initialize export service
  final exportService = ExportService();
  
  // Connect WebSocket when token changes
  authService.onTokenChanged = (token) {
    if (token != null) {
      websocketService.setToken(token);
      websocketService.connect();
    } else {
      websocketService.disconnect();
    }
  };
  
  await authService.loadSavedToken();
  
  runApp(
    MultiProvider(
      providers: [
        Provider<ApiService>.value(value: apiService),
        Provider<HostService>.value(value: hostService),
        Provider<ExportService>.value(value: exportService),
        ChangeNotifierProvider<AuthService>.value(value: authService),
        ChangeNotifierProvider<WebSocketService>.value(value: websocketService),
      ],
      child: const MizCallAdminApp(),
    ),
  );
}

class MizCallAdminApp extends StatelessWidget {
  const MizCallAdminApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ScreenUtilInit(
      designSize: const Size(1920, 1080),
      minTextAdapt: true,
      splitScreenMode: true,
      builder: (context, child) {
        return MaterialApp.router(
          title: AppConfig.appName,
          debugShowCheckedModeBanner: false,
          theme: AppTheme.lightTheme,
          darkTheme: AppTheme.darkTheme,
          themeMode: ThemeMode.system,
          routerConfig: AppRouter.router,
        );
      },
    );
  }
}
