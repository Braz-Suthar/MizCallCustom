import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../config/theme.dart';
import '../services/auth_service.dart';

class MainLayout extends StatefulWidget {
  final Widget child;

  const MainLayout({super.key, required this.child});

  @override
  State<MainLayout> createState() => _MainLayoutState();
}

class _MainLayoutState extends State<MainLayout> {
  int _selectedIndex = 0;
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();

  final List<_NavItem> _navItems = [
    _NavItem(
      label: 'Dashboard',
      icon: Icons.dashboard_outlined,
      selectedIcon: Icons.dashboard,
      route: '/dashboard',
    ),
    _NavItem(
      label: 'Hosts',
      icon: Icons.business_outlined,
      selectedIcon: Icons.business,
      route: '/hosts',
    ),
    _NavItem(
      label: 'Users',
      icon: Icons.people_outline,
      selectedIcon: Icons.people,
      route: '/users',
    ),
    _NavItem(
      label: 'Analytics',
      icon: Icons.insights_outlined,
      selectedIcon: Icons.insights,
      route: '/analytics',
    ),
    _NavItem(
      label: 'Performance',
      icon: Icons.speed_outlined,
      selectedIcon: Icons.speed,
      route: '/performance',
    ),
    _NavItem(
      label: 'Logs',
      icon: Icons.article_outlined,
      selectedIcon: Icons.article,
      route: '/logs',
    ),
    _NavItem(
      label: 'Backups',
      icon: Icons.backup_outlined,
      selectedIcon: Icons.backup,
      route: '/backup',
    ),
  ];

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _updateSelectedIndex();
  }

  void _updateSelectedIndex() {
    final location = GoRouterState.of(context).uri.path;
    for (var i = 0; i < _navItems.length; i++) {
      if (location.startsWith(_navItems[i].route)) {
        setState(() => _selectedIndex = i);
        break;
      }
    }
  }

  void _onNavItemTapped(int index) {
    setState(() => _selectedIndex = index);
    context.go(_navItems[index].route);
  }

  Future<void> _handleLogout() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirm Logout'),
        content: const Text('Are you sure you want to sign out?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.dangerRed,
            ),
            child: const Text('Logout'),
          ),
        ],
      ),
    );

    if (confirm == true && mounted) {
      await context.read<AuthService>().logout();
      if (mounted) context.go('/login');
    }
  }

  Widget _buildSidebarContent(BuildContext context, ThemeData theme, String username, {bool isDrawer = false}) {
    return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header
                Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [AppTheme.primaryBlue, Color(0xFF2563EB)],
                          ),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: const Icon(
                          Icons.admin_panel_settings,
                          size: 32,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'MizCall Admin',
                        style: theme.textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'System Management',
                        style: theme.textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),

                const Divider(height: 1),

                // Navigation Items
                Expanded(
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    itemCount: _navItems.length + 2, // +2 for dividers
                    itemBuilder: (context, index) {
                      // Add divider after Users (index 2)
                      if (index == 3) {
                        return const Padding(
                          padding: EdgeInsets.symmetric(vertical: 8),
                          child: Divider(height: 1),
                        );
                      }
                      // Add divider after Logs (index 6 accounting for first divider)
                      if (index == 7) {
                        return const Padding(
                          padding: EdgeInsets.symmetric(vertical: 8),
                          child: Divider(height: 1),
                        );
                      }
                      
                      // Adjust item index for dividers
                      final itemIndex = index > 7 ? index - 2 : (index > 3 ? index - 1 : index);
                      final item = _navItems[itemIndex];
                      final isSelected = _selectedIndex == itemIndex;

                      return Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Material(
                          color: Colors.transparent,
                          child: InkWell(
                            onTap: () {
                              _onNavItemTapped(index);
                              // Close drawer on mobile after navigation
                              if (isDrawer && Navigator.canPop(context)) {
                                Navigator.pop(context);
                              }
                            },
                            borderRadius: BorderRadius.circular(12),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 12,
                              ),
                              decoration: BoxDecoration(
                                color: isSelected
                                    ? AppTheme.primaryBlue.withOpacity(0.1)
                                    : Colors.transparent,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: isSelected
                                      ? AppTheme.primaryBlue.withOpacity(0.3)
                                      : Colors.transparent,
                                  width: 1,
                                ),
                              ),
                              child: Row(
                                children: [
                                  Icon(
                                    isSelected ? item.selectedIcon : item.icon,
                                    color: isSelected
                                        ? AppTheme.primaryBlue
                                        : theme.textTheme.bodyMedium?.color,
                                    size: 22,
                                  ),
                                  const SizedBox(width: 14),
                                  Text(
                                    item.label,
                                    style: theme.textTheme.titleMedium?.copyWith(
                                      color: isSelected
                                          ? AppTheme.primaryBlue
                                          : null,
                                      fontWeight: isSelected
                                          ? FontWeight.w700
                                          : FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),

                const Divider(height: 1),

                // User Profile & Logout
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: theme.brightness == Brightness.dark
                              ? AppTheme.darkBackground
                              : AppTheme.lightBackground,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 40,
                              height: 40,
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(
                                  colors: [AppTheme.primaryBlue, Color(0xFF2563EB)],
                                ),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Center(
                                child: Text(
                                  username[0].toUpperCase(),
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    username,
                                    style: theme.textTheme.titleMedium,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  Text(
                                    'Administrator',
                                    style: theme.textTheme.bodySmall,
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          onPressed: _handleLogout,
                          icon: const Icon(Icons.logout, size: 18),
                          label: const Text('Logout'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppTheme.dangerRed,
                            side: const BorderSide(color: AppTheme.dangerRed),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final authService = context.watch<AuthService>();
    final username = authService.currentUser?.username ?? 'Admin';
    final mediaQuery = MediaQuery.of(context);
    final isMobile = mediaQuery.size.width < 800;

    final sidebarContent = _buildSidebarContent(context, theme, username, isDrawer: isMobile);

    return Scaffold(
      key: _scaffoldKey,
      drawer: isMobile
          ? Drawer(
              width: 280,
              child: sidebarContent,
            )
          : null,
      body: Row(
        children: [
          // Desktop Sidebar (only show on larger screens)
          if (!isMobile)
            Container(
              width: 280,
              decoration: BoxDecoration(
                color: theme.cardTheme.color,
                border: Border(
                  right: BorderSide(
                    color: theme.brightness == Brightness.dark
                        ? AppTheme.darkBorder
                        : AppTheme.lightBorder,
                    width: 1,
                  ),
                ),
              ),
              child: sidebarContent,
            ),

          // Main Content
          Expanded(
            child: Column(
              children: [
                // Mobile App Bar (hamburger menu)
                if (isMobile)
                  Container(
                    decoration: BoxDecoration(
                      color: theme.cardTheme.color,
                      border: Border(
                        bottom: BorderSide(
                          color: theme.brightness == Brightness.dark
                              ? AppTheme.darkBorder
                              : AppTheme.lightBorder,
                          width: 1,
                        ),
                      ),
                    ),
                    child: SafeArea(
                      bottom: false,
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        child: Row(
                          children: [
                            IconButton(
                              icon: const Icon(Icons.menu),
                              onPressed: () {
                                _scaffoldKey.currentState?.openDrawer();
                              },
                              tooltip: 'Menu',
                            ),
                            const SizedBox(width: 12),
                            Container(
                              width: 40,
                              height: 40,
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(
                                  colors: [AppTheme.primaryBlue, Color(0xFF2563EB)],
                                ),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Icon(
                                Icons.admin_panel_settings,
                                size: 24,
                                color: Colors.white,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Text(
                              'MizCall Admin',
                              style: theme.textTheme.titleLarge?.copyWith(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                
                // Main content
                Expanded(
                  child: widget.child,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _NavItem {
  final String label;
  final IconData icon;
  final IconData selectedIcon;
  final String route;

  _NavItem({
    required this.label,
    required this.icon,
    required this.selectedIcon,
    required this.route,
  });
}
