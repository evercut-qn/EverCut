// lib/core/theme/components/appbar.dart

import 'package:flutter/material.dart';

import '../../../shared/extensions/context/device_metrics_extension.dart';
import '../foundation/colors/dark_color_tokens.dart';
import '../foundation/colors/light_color_tokens.dart';

Map<String, AppBarTheme> appBarTheme(BuildContext context) => {
  'Dark': _appBarTheme(
    context: context,
    actionsIconColor: DarkColorTokens.neutralShade850,
    backgroundColor: DarkColorTokens.appBarBackgroundColor,
    foregroundColor: DarkColorTokens.appBarBackgroundColor,
    iconColor: DarkColorTokens.neutralShade850,
    shapeBottomBorderColor: DarkColorTokens.primaryDividerColor,
    surfaceTintColor: DarkColorTokens.appBarBackgroundColor,
    titleTextColor: DarkColorTokens.neutralShade850,
  ),
  'Light': _appBarTheme(
    context: context,
    actionsIconColor: LightColorTokens.neutralShade850,
    backgroundColor: LightColorTokens.appBarBackgroundColor,
    foregroundColor: LightColorTokens.appBarBackgroundColor,
    iconColor: LightColorTokens.neutralShade850,
    shapeBottomBorderColor: LightColorTokens.primaryDividerColor,
    surfaceTintColor: LightColorTokens.appBarBackgroundColor,
    titleTextColor: LightColorTokens.neutralShade850,
  ),
};

AppBarTheme _appBarTheme({
  required BuildContext context,
  required Color actionsIconColor,
  required Color backgroundColor,
  required Color foregroundColor,
  required Color iconColor,
  required Color shapeBottomBorderColor,
  required Color surfaceTintColor,
  required Color titleTextColor,
}) {
  return AppBarTheme(
    actionsIconTheme: IconThemeData(
      color: actionsIconColor,
      size: context.scale(24),
    ),
    backgroundColor: backgroundColor,
    foregroundColor: foregroundColor,
    iconTheme: IconThemeData(
      color: iconColor,
      size: context.scale(24),
    ),
    shape: Border(
      bottom: BorderSide(
        color: shapeBottomBorderColor,
      ),
    ),
    surfaceTintColor: surfaceTintColor,
    titleTextStyle: TextStyle(
      color: titleTextColor,
      fontFamily: 'DMSans',
      fontSize: context.scale(18),
      fontWeight: FontWeight.w500,
    ),
    titleSpacing: 0,
  );
}
