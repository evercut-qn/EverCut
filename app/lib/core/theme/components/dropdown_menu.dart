// lib/core/theme/components/dropdown_menu.dart

import 'package:flutter/material.dart';

import '../../../shared/extensions/context/device_metrics_extension.dart';
import '../foundation/colors/dark_color_tokens.dart';
import '../foundation/colors/light_color_tokens.dart';

import 'input_decoration.dart';

Map<String, DropdownMenuThemeData> dropdownMenuTheme(BuildContext context) => {
  'Dark': _dropdownMenuTheme(
    context: context,
    inputDecorationTheme: inputDecorationTheme(context)['Dark']!,
    textColor: DarkColorTokens.neutralShade850,
    backgroundColor: DarkColorTokens.dropdownMenuBackgroundColor,
    shadowColor: Colors.black.withAlpha(95),
  ),
  'Light': _dropdownMenuTheme(
    context: context,
    inputDecorationTheme: inputDecorationTheme(context)['Light']!,
    textColor: LightColorTokens.neutralShade850,
    backgroundColor: LightColorTokens.dropdownMenuBackgroundColor,
    shadowColor: Colors.black.withAlpha(95),
  ),
};

DropdownMenuThemeData _dropdownMenuTheme({
  required BuildContext context,
  required InputDecorationTheme inputDecorationTheme,
  required Color textColor,
  required Color backgroundColor,
  required Color shadowColor,
}) {
  return DropdownMenuThemeData(
    textStyle: TextStyle(
      color: textColor,
      fontSize: context.scale(14),
    ),
    inputDecorationTheme: inputDecorationTheme,
    menuStyle: MenuStyle(
      backgroundColor: WidgetStatePropertyAll(backgroundColor),
      elevation: WidgetStatePropertyAll(context.scale(2)),
      padding: WidgetStatePropertyAll(
        EdgeInsets.symmetric(vertical: context.scale(8)),
      ),
      shadowColor: WidgetStatePropertyAll(shadowColor),
      shape: WidgetStatePropertyAll(
        RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(context.scale(8)),
        ),
      ),
      surfaceTintColor: WidgetStatePropertyAll(backgroundColor),
    ),
  );
}
