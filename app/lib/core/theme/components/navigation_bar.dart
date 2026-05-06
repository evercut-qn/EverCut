// lib/core/theme/components/navigation_bar.dart

import 'package:flutter/material.dart';

import '../../../shared/extensions/context/device_metrics_extension.dart';
import '../foundation/colors/dark_color_tokens.dart';
import '../foundation/colors/light_color_tokens.dart';

Map<String, NavigationBarThemeData> navigationBarTheme(BuildContext context) => {
  'Dark': _navigationBarTheme(
    context: context,
    backgroundColor: DarkColorTokens.navigationBarBackgroundColor,
    selectedIconColor: DarkColorTokens.greenShade300,
    unselectedIconColor: DarkColorTokens.neutralShade750,
    indicatorColor: DarkColorTokens.greenShade100.withAlpha(31),
    selectedTextColor: DarkColorTokens.neutralShade850,
    unselectedTextColor: DarkColorTokens.neutralShade750,
    overlayColor: DarkColorTokens.greenShade300.withAlpha(31),
  ),
  'Light': _navigationBarTheme(
    context: context,
    backgroundColor: LightColorTokens.navigationBarBackgroundColor,
    selectedIconColor: LightColorTokens.greenShade300,
    unselectedIconColor: LightColorTokens.neutralShade750,
    indicatorColor: LightColorTokens.greenShade100.withAlpha(31),
    selectedTextColor: LightColorTokens.neutralShade850,
    unselectedTextColor: LightColorTokens.neutralShade750,
    overlayColor: LightColorTokens.greenShade300.withAlpha(31),
  ),
};

NavigationBarThemeData _navigationBarTheme({
  required BuildContext context,
  required Color backgroundColor,
  required Color selectedIconColor,
  required Color unselectedIconColor,
  required Color indicatorColor,
  required Color selectedTextColor,
  required Color unselectedTextColor,
  required Color overlayColor,
}) {
  return NavigationBarThemeData(
    backgroundColor: backgroundColor,
    iconTheme: WidgetStateProperty.resolveWith((states) {
      if (states.contains(WidgetState.selected)) {
        return IconThemeData(
          color: selectedIconColor,
          size: context.scale(24),
        );
      }
      return IconThemeData(
        color: unselectedIconColor,
        size: context.scale(24),
      );
    }),
    indicatorColor: indicatorColor,
    labelTextStyle: WidgetStateTextStyle.resolveWith((states) {
      if (states.contains(WidgetState.selected)) {
        return TextStyle(
          color: selectedTextColor,
          fontSize: context.scale(12),
          fontWeight: FontWeight.bold,
        );
      }
      return TextStyle(
        color: unselectedTextColor,
        fontSize: context.scale(12),
        fontWeight: FontWeight.normal,
      );
    }),
    overlayColor: WidgetStateColor.resolveWith((states) {
      return overlayColor;
    }),
  );
}
