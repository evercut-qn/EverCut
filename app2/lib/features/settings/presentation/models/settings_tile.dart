// lib/features/settings/presentation/models/settings_tile.dart

import 'package:flutter/widgets.dart';

class SettingsTile {
  final Color? color;
  final IconData icon;
  final String title;
  final VoidCallback onTap;
  final bool showArrow;

  const SettingsTile({
    this.color,
    required this.icon,
    required this.title,
    required this.onTap,
    this.showArrow = true,
  });
}
