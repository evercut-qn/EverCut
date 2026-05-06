// lib/core/theme/components/input_decoration.dart

import 'package:flutter/material.dart';

import '../../../shared/extensions/context/device_metrics_extension.dart';
import '../foundation/colors/dark_color_tokens.dart';
import '../foundation/colors/light_color_tokens.dart';

Map<String, InputDecorationTheme> inputDecorationTheme(BuildContext context) => {
  'Dark': _inputDecorationTheme(
    context: context,
    defaultFillColor: DarkColorTokens.neutralShade300.withAlpha(127),
    selectedFillColor: DarkColorTokens.neutralShade350.withAlpha(127),
    disabledFillColor: DarkColorTokens.neutralShade300.withAlpha(31),
    errorFillColor: DarkColorTokens.redShade50.withAlpha(31),
    enabledBorderColor: DarkColorTokens.neutralShade600.withAlpha(127),
    focusedBorderColor: DarkColorTokens.greenShade100.withAlpha(127),
    disabledBorderColor: DarkColorTokens.neutralShade550.withAlpha(31),
    errorBorderColor: DarkColorTokens.redShade100.withAlpha(127),
    focusedErrorBorderColor: DarkColorTokens.redShade100.withAlpha(127),
    labelColor: DarkColorTokens.neutralShade750,
    floatingLabelColor: DarkColorTokens.neutralShade750,
    hintTextColor: DarkColorTokens.neutralShade750,
    errorTextColor: DarkColorTokens.redShade100.withAlpha(127),
    prefixIconColor: DarkColorTokens.neutralShade800,
    suffixIconColor: DarkColorTokens.neutralShade800,
  ),
  'Light': _inputDecorationTheme(
    context: context,
    defaultFillColor: LightColorTokens.neutralShade100,
    selectedFillColor: LightColorTokens.neutralShade150.withAlpha(127),
    disabledFillColor: LightColorTokens.neutralShade100.withAlpha(127),
    errorFillColor: LightColorTokens.redShade50.withAlpha(31),
    enabledBorderColor: LightColorTokens.neutralShade200,
    focusedBorderColor: LightColorTokens.greenShade100.withAlpha(127),
    disabledBorderColor: LightColorTokens.neutralShade150.withAlpha(127),
    errorBorderColor: LightColorTokens.redShade100.withAlpha(127),
    focusedErrorBorderColor: LightColorTokens.redShade100.withAlpha(127),
    labelColor: LightColorTokens.neutralShade350,
    floatingLabelColor: LightColorTokens.neutralShade350,
    hintTextColor: LightColorTokens.neutralShade350,
    errorTextColor: LightColorTokens.redShade100.withAlpha(127),
    prefixIconColor: LightColorTokens.neutralShade400,
    suffixIconColor: LightColorTokens.neutralShade400,
  ),
};

InputDecorationTheme _inputDecorationTheme({
  required BuildContext context,
  required Color defaultFillColor,
  required Color selectedFillColor,
  required Color disabledFillColor,
  required Color errorFillColor,
  required Color enabledBorderColor,
  required Color focusedBorderColor,
  required Color disabledBorderColor,
  required Color errorBorderColor,
  required Color focusedErrorBorderColor,
  required Color labelColor,
  required Color floatingLabelColor,
  required Color hintTextColor,
  required Color errorTextColor,
  required Color prefixIconColor,
  required Color suffixIconColor,
}) {
  return InputDecorationTheme(
    contentPadding: EdgeInsets.symmetric(
      vertical: context.scale(12),
      horizontal: context.scale(18),
    ),
    disabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(context.scale(8)),
      borderSide: BorderSide(
        color: disabledBorderColor,
      ),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(context.scale(8)),
      borderSide: BorderSide(
        color: enabledBorderColor,
      ),
    ),
    errorBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(context.scale(8)),
      borderSide: BorderSide(
        color: errorBorderColor,
      ),
    ),
    errorStyle: TextStyle(
      color: errorTextColor,
      fontSize: context.scale(12),
    ),
    fillColor: WidgetStateColor.resolveWith((states) {
      if (states.contains(WidgetState.selected)) {
        return selectedFillColor;
      } else if (states.contains(WidgetState.error)) {
        return errorFillColor;
      } else if (states.contains(WidgetState.disabled)) {
        return disabledFillColor;
      } else {
        return defaultFillColor;
      }
    }),
    filled: true,
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(context.scale(8)),
      borderSide: BorderSide(
        color: focusedBorderColor,
        width: context.scale(2),
      ),
    ),
    focusedErrorBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(context.scale(8)),
      borderSide: BorderSide(
        color: focusedErrorBorderColor,
        width: context.scale(2),
      ),
    ),
    floatingLabelStyle: TextStyle(
      color: floatingLabelColor,
      fontSize: context.scale(14),
      fontWeight: FontWeight.w500,
    ),
    hintStyle: TextStyle(
      color: hintTextColor,
      fontSize: context.scale(14),
    ),
    isDense: true,
    labelStyle: TextStyle(
      color: labelColor,
      fontSize: context.scale(14),
    ),
    prefixIconColor: prefixIconColor,
    suffixIconColor: suffixIconColor,
  );
}
