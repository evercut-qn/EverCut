// lib/core/theme/components/date_picker.dart

import 'package:flutter/material.dart';

import '../../../shared/extensions/context/device_metrics_extension.dart';
import '../foundation/colors/dark_color_tokens.dart';
import '../foundation/colors/light_color_tokens.dart';

import 'input_decoration.dart';

Map<String, DatePickerThemeData> datePickerTheme(BuildContext context) => {
  'Dark': _datePickerTheme(
    context: context,
    inputDecorationTheme: inputDecorationTheme(context)['Dark']!,
    dialogBackgroundColor: DarkColorTokens.datePickerBackgroundColor,
    headerBackgroundColor: DarkColorTokens.greenShade300.withAlpha(31),
    primaryTextColor: DarkColorTokens.neutralShade850,
    headerTextColor: DarkColorTokens.neutralShade850,
    disabledTextColor: DarkColorTokens.neutralShade650,
    selectedTextColor: DarkColorTokens.datePickerBackgroundColor,
    buttonHoverColor: DarkColorTokens.greenShade300.withAlpha(31),
    buttonTextColor: DarkColorTokens.greenShade100,
    dayHoverColor: DarkColorTokens.greenShade300.withAlpha(31),
    dividerColor: DarkColorTokens.primaryDividerColor,
    selectedDayBackground: DarkColorTokens.greenShade100,
    todayBorderColor: DarkColorTokens.greenShade100,
  ),
  'Light': _datePickerTheme(
    context: context,
    inputDecorationTheme: inputDecorationTheme(context)['Light']!,
    dialogBackgroundColor: LightColorTokens.datePickerBackgroundColor,
    headerBackgroundColor: LightColorTokens.greenShade300.withAlpha(31),
    primaryTextColor: LightColorTokens.neutralShade850,
    headerTextColor: LightColorTokens.neutralShade850,
    disabledTextColor: LightColorTokens.neutralShade350,
    selectedTextColor: LightColorTokens.datePickerBackgroundColor,
    buttonHoverColor: LightColorTokens.greenShade300.withAlpha(31),
    buttonTextColor: LightColorTokens.greenShade100,
    dayHoverColor: LightColorTokens.greenShade300.withAlpha(31),
    dividerColor: LightColorTokens.primaryDividerColor,
    selectedDayBackground: LightColorTokens.greenShade100,
    todayBorderColor: LightColorTokens.greenShade100,
  ),
};

DatePickerThemeData _datePickerTheme({
  required BuildContext context,
  required InputDecorationTheme inputDecorationTheme,
  required Color dialogBackgroundColor,
  required Color headerBackgroundColor,
  required Color primaryTextColor,
  required Color headerTextColor,
  required Color disabledTextColor,
  required Color selectedTextColor,
  required Color buttonHoverColor,
  required Color buttonTextColor,
  required Color dayHoverColor,
  required Color dividerColor,
  required Color selectedDayBackground,
  required Color todayBorderColor,
}) {
  return DatePickerThemeData(
    backgroundColor: dialogBackgroundColor,
    cancelButtonStyle: ButtonStyle(
      backgroundColor: WidgetStateColor.transparent,
      foregroundColor: WidgetStatePropertyAll(buttonTextColor),
      overlayColor: WidgetStatePropertyAll(buttonHoverColor),
    ),
    confirmButtonStyle: ButtonStyle(
      backgroundColor: WidgetStateColor.transparent,
      foregroundColor: WidgetStatePropertyAll(buttonTextColor),
      overlayColor: WidgetStatePropertyAll(buttonHoverColor),
    ),
    dayBackgroundColor: WidgetStateColor.resolveWith((states) {
      if (states.contains(WidgetState.selected)) {
        return selectedDayBackground;
      } else {
        return Colors.transparent;
      }
    }),
    dayForegroundColor: WidgetStateColor.resolveWith((states) {
      if (states.contains(WidgetState.selected)) {
        return selectedTextColor;
      } else if (states.contains(WidgetState.disabled)) {
        return disabledTextColor;
      } else {
        return primaryTextColor;
      }
    }),
    dayStyle: TextStyle(
      fontSize: context.scale(16),
    ),
    dayOverlayColor: WidgetStatePropertyAll(dayHoverColor),
    dividerColor: dividerColor,
    elevation: 0,
    headerBackgroundColor: headerBackgroundColor,
    headerForegroundColor: headerTextColor,
    headerHeadlineStyle: TextStyle(
      fontSize: context.scale(32),
      fontWeight: FontWeight.w500,
    ),
    headerHelpStyle: TextStyle(
      fontSize: context.scale(14),
      fontWeight: FontWeight.w500,
    ),
    inputDecorationTheme: inputDecorationTheme.copyWith(
      contentPadding: EdgeInsets.zero,
    ),
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(context.scale(16)),
    ),
    surfaceTintColor: dialogBackgroundColor,
    todayBackgroundColor: WidgetStateColor.resolveWith((states) {
      if (states.contains(WidgetState.selected)) {
        return selectedDayBackground;
      } else {
        return Colors.transparent;
      }
    }),
    todayBorder: BorderSide(color: todayBorderColor),
    todayForegroundColor: WidgetStateColor.resolveWith((states) {
      if (states.contains(WidgetState.selected)) {
        return selectedTextColor;
      } else {
        return todayBorderColor;
      }
    }),
    weekdayStyle: TextStyle(
      color: primaryTextColor,
      fontSize: context.scale(16),
    ),
    yearBackgroundColor: WidgetStateColor.resolveWith((states) {
      if (states.contains(WidgetState.selected)) {
        return selectedDayBackground;
      } else {
        return Colors.transparent;
      }
    }),
    yearForegroundColor: WidgetStateColor.resolveWith((states) {
      if (states.contains(WidgetState.selected)) {
        return selectedTextColor;
      } else if (states.contains(WidgetState.disabled)) {
        return disabledTextColor;
      } else {
        return primaryTextColor;
      }
    }),
    yearOverlayColor: WidgetStatePropertyAll(dayHoverColor),
    yearStyle: TextStyle(
      fontSize: context.scale(16),
    ),
  );
}
