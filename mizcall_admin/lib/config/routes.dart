import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../screens/login_screen.dart';
import '../screens/dashboard_screen.dart';
import '../screens/hosts_screen.dart';
import '../screens/host_details_screen.dart';
import '../screens/logs_screen.dart';
import '../screens/main_layout.dart';
import '../services/auth_service.dart';

class AppRouter {
  static final GoRouter router = GoRouter(
    initialLocation: '/login',
    redirect: (BuildContext context, GoRouterState state) {
      final authService = context.read<AuthService>();
      final isAuthenticated = authService.isAuthenticated;
      final isLoginRoute = state.matchedLocation == '/login';

      // If not authenticated and trying to access protected route, redirect to login
      if (!isAuthenticated && !isLoginRoute) {
        return '/login';
      }

      // If authenticated and on login page, redirect to dashboard
      if (isAuthenticated && isLoginRoute) {
        return '/dashboard';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      ShellRoute(
        builder: (context, state, child) => MainLayout(child: child),
        routes: [
          GoRoute(
            path: '/dashboard',
            builder: (context, state) => const DashboardScreen(),
          ),
          GoRoute(
            path: '/hosts',
            builder: (context, state) => const HostsScreen(),
          ),
          GoRoute(
            path: '/hosts/:hostId',
            builder: (context, state) {
              final hostId = state.pathParameters['hostId']!;
              return HostDetailsScreen(hostId: hostId);
            },
          ),
          GoRoute(
            path: '/logs',
            builder: (context, state) => const LogsScreen(),
          ),
        ],
      ),
    ],
  );
}
