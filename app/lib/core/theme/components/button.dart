// lib/core/theme/components/button.dart

import 'package:flutter/material.dart';

import '../../../shared/extensions/context/device_metrics_extension.dart';
import '../foundation/colors/dark_color_tokens.dart';
import '../foundation/colors/light_color_tokens.dart';

Map<String, FilledButtonThemeData> filledButtonTheme(BuildContext context) => {
  'Dark': _filledButtonTheme(
    context: context,
    backgroundColor: DarkColorTokens.greenShade100,
    foregroundColor: DarkColorTokens.neutralShade50,
    overlayColor: DarkColorTokens.greenShade400.withAlpha(127),
    pressedBorderColor: DarkColorTokens.greenShade400.withAlpha(127),
    defaultBorderColor: DarkColorTokens.greenShade100,
    textColor: DarkColorTokens.neutralShade50,
  ),
  'Light': _filledButtonTheme(
    context: context,
    backgroundColor: LightColorTokens.greenShade100,
    foregroundColor: LightColorTokens.neutralShade50,
    overlayColor: LightColorTokens.greenShade400.withAlpha(127),
    pressedBorderColor: LightColorTokens.greenShade400.withAlpha(127),
    defaultBorderColor: LightColorTokens.greenShade100,
    textColor: LightColorTokens.neutralShade50,
  ),
};

FilledButtonThemeData _filledButtonTheme({
  required BuildContext context,
  required Color backgroundColor,
  required Color foregroundColor,
  required Color overlayColor,
  required Color pressedBorderColor,
  required Color defaultBorderColor,
  required Color textColor,
}) {
  return FilledButtonThemeData(
    style: ButtonStyle(
      backgroundColor: WidgetStatePropertyAll(backgroundColor),
      foregroundColor: WidgetStatePropertyAll(foregroundColor),
      overlayColor: WidgetStatePropertyAll(overlayColor),
      padding: WidgetStatePropertyAll(
        EdgeInsets.symmetric(
          vertical: context.scale(14.45),
          horizontal: context.scale(18),
        ),
      ),
      shape: WidgetStatePropertyAll(
        RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(context.scale(8)),
        ),
      ),
      side: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.pressed)) {
          return BorderSide(color: pressedBorderColor);
        } else {
          return BorderSide(color: defaultBorderColor);
        }
      }),
      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      textStyle: WidgetStatePropertyAll(
        TextStyle(
          color: textColor,
          fontFamily: 'DMSans',
          fontSize: context.scale(14),
          fontWeight: FontWeight.w500,
        ),
      ),
    ),
  );
}

Map<String, IconButtonThemeData> iconButtonTheme(BuildContext context) => {
  'Dark': _iconButtonTheme(
    context: context,
    iconColor: DarkColorTokens.neutralShade850,
    overlayColor: DarkColorTokens.neutralShade350.withAlpha(127),
  ),
  'Light': _iconButtonTheme(
    context: context,
    iconColor: LightColorTokens.neutralShade850,
    overlayColor: LightColorTokens.neutralShade350.withAlpha(127),
  ),
};

IconButtonThemeData _iconButtonTheme({
  required BuildContext context,
  required Color iconColor,
  required Color overlayColor,
}) {
  return IconButtonThemeData(
    style: ButtonStyle(
      backgroundColor: WidgetStateColor.transparent,
      iconColor: WidgetStatePropertyAll(iconColor),
      iconSize: WidgetStatePropertyAll(context.scale(24)),
      overlayColor: WidgetStatePropertyAll(overlayColor),
      surfaceTintColor: WidgetStateColor.transparent,
    ),
  );
}

Map<String, OutlinedButtonThemeData> outlinedButtonTheme(BuildContext context) => {
  'Dark': _outlinedButtonTheme(
    context: context,
    foregroundColor: DarkColorTokens.greenShade100,
    overlayColor: DarkColorTokens.neutralShade150.withAlpha(127),
    borderColor: DarkColorTokens.neutralShade650,
  ),
  'Light': _outlinedButtonTheme(
    context: context,
    foregroundColor: LightColorTokens.greenShade100,
    overlayColor: LightColorTokens.neutralShade150.withAlpha(127),
    borderColor: LightColorTokens.neutralShade650,
  ),
};

OutlinedButtonThemeData _outlinedButtonTheme({
  required BuildContext context,
  required Color foregroundColor,
  required Color overlayColor,
  required Color borderColor,
}) {
  return OutlinedButtonThemeData(
    style: ButtonStyle(
      backgroundColor: const WidgetStatePropertyAll(Colors.transparent),
      foregroundColor: WidgetStatePropertyAll(foregroundColor),
      overlayColor: WidgetStatePropertyAll(overlayColor),
      padding: WidgetStatePropertyAll(
        EdgeInsets.symmetric(
          vertical: context.scale(14.45),
          horizontal: context.scale(18),
        ),
      ),
      shape: WidgetStatePropertyAll(
        RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(context.scale(8)),
        ),
      ),
      side: WidgetStatePropertyAll(
        BorderSide(
          color: borderColor,
        ),
      ),
      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      textStyle: WidgetStatePropertyAll(
        TextStyle(
          fontFamily: 'DMSans',
          fontSize: context.scale(14),
          fontWeight: FontWeight.w500,
        ),
      ),
    ),
  );
}

Map<String, FloatingActionButtonThemeData> floatingActionButtonTheme(BuildContext context) => {
  'Dark': _floatingActionButtonTheme(
    context: context,
    backgroundColor: DarkColorTokens.greenShade100,
    foregroundColor: DarkColorTokens.neutralShade50,
    splashColor: DarkColorTokens.greenShade400.withAlpha(127),
    textColor: DarkColorTokens.neutralShade50,
  ),
  'Light': _floatingActionButtonTheme(
    context: context,
    backgroundColor: LightColorTokens.greenShade100,
    foregroundColor: LightColorTokens.neutralShade50,
    splashColor: LightColorTokens.greenShade400.withAlpha(127),
    textColor: LightColorTokens.neutralShade50,
  ),
};

FloatingActionButtonThemeData _floatingActionButtonTheme({
  required BuildContext context,
  required Color backgroundColor,
  required Color foregroundColor,
  required Color splashColor,
  required Color textColor,
}) {
  return FloatingActionButtonThemeData(
    backgroundColor: backgroundColor,
    elevation: context.scale(4),
    extendedPadding: EdgeInsets.all(context.scale(18)),
    extendedTextStyle: TextStyle(
      color: textColor,
      fontFamily: 'DMSans',
      fontSize: context.scale(14),
      fontWeight: FontWeight.w500,
    ),
    foregroundColor: foregroundColor,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(context.scale(8)),
    ),
    splashColor: splashColor,
  );
}
