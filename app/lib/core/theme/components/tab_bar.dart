// lib/core/theme/components/tab_bar.dart

import 'package:flutter/material.dart';

import '../../../shared/extensions/context/device_metrics_extension.dart';
import '../foundation/colors/dark_color_tokens.dart';
import '../foundation/colors/light_color_tokens.dart';

Map<String, TabBarThemeData> tabBarTheme(BuildContext context) => {
  'Dark': _tabBarTheme(
    context: context,
    dividerColor: DarkColorTokens.primaryDividerColor,
    indicatorColor: DarkColorTokens.greenShade100,
    labelColor: DarkColorTokens.greenShade100,
    overlayColor: DarkColorTokens.greenShade600.withAlpha(41),
    unselectedLabelColor: DarkColorTokens.neutralShade750,
  ),
  'Light': _tabBarTheme(
    context: context,
    dividerColor: LightColorTokens.primaryDividerColor,
    indicatorColor: LightColorTokens.greenShade100,
    labelColor: LightColorTokens.greenShade100,
    overlayColor: LightColorTokens.greenShade600.withAlpha(41),
    unselectedLabelColor: LightColorTokens.neutralShade750,
  ),
};

TabBarThemeData _tabBarTheme({
  required BuildContext context,
  required Color dividerColor,
  required Color indicatorColor,
  required Color labelColor,
  required Color overlayColor,
  required Color unselectedLabelColor,
}) {
  return TabBarThemeData(
    dividerColor: dividerColor,
    indicatorColor: indicatorColor,
    labelColor: labelColor,
    labelPadding: EdgeInsets.all(context.scale(6)),
    labelStyle: TextStyle(
      fontFamily: 'DMSans',
      fontSize: context.scale(14),
      fontWeight: FontWeight.w500,
    ),
    overlayColor: WidgetStatePropertyAll(overlayColor),
    unselectedLabelColor: unselectedLabelColor,
    unselectedLabelStyle: TextStyle(
      fontFamily: 'DMSans',
      fontSize: context.scale(14),
      fontWeight: FontWeight.w400,
    ),
  );
}
