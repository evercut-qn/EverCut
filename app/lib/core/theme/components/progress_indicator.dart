// lib/core/theme/components/progress_indicator.dart

import 'package:flutter/material.dart';

import '../../../shared/extensions/context/device_metrics_extension.dart';
import '../foundation/colors/dark_color_tokens.dart';
import '../foundation/colors/light_color_tokens.dart';

Map<String, ProgressIndicatorThemeData> progressIndicatorTheme(BuildContext context) => {
  'Dark': _progressIndicatorTheme(
    context: context,
    color: DarkColorTokens.neutralShade850,
    circularTrackColor: DarkColorTokens.backgroundShade100,
    linearTrackColor: DarkColorTokens.backgroundShade100,
  ),
  'Light': _progressIndicatorTheme(
    context: context,
    color: LightColorTokens.neutralShade850,
    circularTrackColor: LightColorTokens.backgroundShade100,
    linearTrackColor: LightColorTokens.backgroundShade100,
  ),
};

ProgressIndicatorThemeData _progressIndicatorTheme({
  required BuildContext context,
  required Color color,
  required Color circularTrackColor,
  required Color linearTrackColor,
}) {
  return ProgressIndicatorThemeData(
    borderRadius: BorderRadius.circular(context.scale(4)),
    color: color,
    circularTrackColor: circularTrackColor,
    linearMinHeight: context.scale(8),
    linearTrackColor: linearTrackColor,
  );
}
