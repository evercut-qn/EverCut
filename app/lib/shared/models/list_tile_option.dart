// lib/shared/models/list_tile_option.dart

import 'package:flutter/widgets.dart';

class ListTileOption<T> {
  final Color? color;
  final IconData icon;
  final String title;
  final VoidCallback? onTap;
  final bool showArrow;
  final T? value;

  const ListTileOption({
    this.color,
    required this.icon,
    required this.title,
    this.onTap,
    this.showArrow = true,
    this.value,
  });
}
