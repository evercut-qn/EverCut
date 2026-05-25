// lib/core/theme/components/popup_menu.dart

import 'package:flutter/material.dart';

import '../../../shared/extensions/context/device_metrics_extension.dart';
import '../foundation/colors/dark_color_tokens.dart';
import '../foundation/colors/light_color_tokens.dart';

Map<String, PopupMenuThemeData> popupMenuTheme(BuildContext context) => {
  'Dark': _popupMenuTheme(
    context: context,
    backgroundColor: DarkColorTokens.popupMenuBackgroundColor,
    iconColor: DarkColorTokens.neutralShade850,
    labelTextColor: DarkColorTokens.neutralShade850,
    shadowColor: Colors.black.withAlpha(95),
    surfaceTintColor: DarkColorTokens.popupMenuBackgroundColor,
  ),
  'Light': _popupMenuTheme(
    context: context,
    backgroundColor: LightColorTokens.popupMenuBackgroundColor,
    iconColor: LightColorTokens.neutralShade850,
    labelTextColor: LightColorTokens.neutralShade850,
    shadowColor: Colors.black.withAlpha(95),
    surfaceTintColor: LightColorTokens.popupMenuBackgroundColor,
  ),
};

PopupMenuThemeData _popupMenuTheme({
  required BuildContext context,
  required Color backgroundColor,
  required Color iconColor,
  required Color labelTextColor,
  required Color shadowColor,
  required Color surfaceTintColor,
}) {
  return PopupMenuThemeData(
    color: backgroundColor,
    elevation: context.scale(2),
    iconColor: iconColor,
    iconSize: context.scale(24),
    labelTextStyle: WidgetStatePropertyAll(
      TextStyle(
        color: labelTextColor,
        fontFamily: 'DMSans',
        fontSize: context.scale(14),
      ),
    ),
    menuPadding: EdgeInsets.symmetric(vertical: context.scale(8)),
    position: PopupMenuPosition.under,
    shadowColor: shadowColor,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(context.scale(8)),
    ),
    surfaceTintColor: surfaceTintColor,
  );
}
