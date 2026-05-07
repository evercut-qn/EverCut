// lib/shared/extensions/context/app_colors_extension.dart

import 'package:flutter/material.dart';

import '../../../core/theme/foundation/app_colors.dart';

extension AppColorsExtension on BuildContext {
  AppColors get appColors => Theme.of(this).extension<AppColors>()!;
}
