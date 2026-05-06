// lib/shared/models/dropdown_menu_option.dart

import 'package:flutter/widgets.dart';

class DropdownMenuOption<T> {
  final IconData icon;
  final String label;
  final T value;

  const DropdownMenuOption({
    required this.icon,
    required this.label,
    required this.value,
  });
}
