// lib/core/theme/components/time_picker.dart

import 'package:flutter/material.dart';

import '../../../shared/extensions/context/device_metrics_extension.dart';
import '../foundation/colors/dark_color_tokens.dart';
import '../foundation/colors/light_color_tokens.dart';

import 'input_decoration.dart';

Map<String, TimePickerThemeData> timePickerTheme(BuildContext context) => {
  'Dark': _timePickerTheme(
    context: context,
    dialogBackgroundColor: DarkColorTokens.timePickerBackgroundColor,
    dialBackgroundColor: DarkColorTokens.neutralShade650.withAlpha(63),
    dialHandColor: DarkColorTokens.greenShade100,
    separatorColor: DarkColorTokens.neutralShade850,
    selectedDialTextColor: DarkColorTokens.neutralShade450,
    unselectedDialTextColor: DarkColorTokens.neutralShade750,
    selectedHourMinuteTextColor: DarkColorTokens.greenShade100,
    unselectedHourMinuteTextColor: DarkColorTokens.neutralShade650,
    inputDecorationTheme: inputDecorationTheme(context)['Dark']!,
    inputFieldColor: DarkColorTokens.neutralShade650.withAlpha(63),
    selectedInputColor: DarkColorTokens.greenShade300.withAlpha(31),
    errorInputColor: DarkColorTokens.redShade50.withAlpha(31),
    dayPeriodBackground: DarkColorTokens.greenShade300.withAlpha(31),
    dayPeriodBorderColor: DarkColorTokens.neutralShade650.withAlpha(95),
    selectedPeriodTextColor: DarkColorTokens.greenShade100,
    unselectedPeriodTextColor: DarkColorTokens.neutralShade650,
    helpTextColor: DarkColorTokens.neutralShade850,
    buttonTextColor: DarkColorTokens.greenShade100,
    buttonHoverColor: DarkColorTokens.greenShade300.withAlpha(31),
    entryModeIconColor: DarkColorTokens.neutralShade850,
  ),
  'Light': _timePickerTheme(
    context: context,
    dialogBackgroundColor: LightColorTokens.timePickerBackgroundColor,
    dialBackgroundColor: LightColorTokens.neutralShade150.withAlpha(127),
    dialHandColor: LightColorTokens.greenShade100,
    separatorColor: LightColorTokens.neutralShade850,
    selectedDialTextColor: LightColorTokens.neutralShade150,
    unselectedDialTextColor: LightColorTokens.neutralShade650,
    selectedHourMinuteTextColor: LightColorTokens.greenShade100,
    unselectedHourMinuteTextColor: LightColorTokens.neutralShade650,
    inputDecorationTheme: inputDecorationTheme(context)['Light']!,
    inputFieldColor: LightColorTokens.neutralShade150.withAlpha(127),
    selectedInputColor: LightColorTokens.greenShade300.withAlpha(31),
    errorInputColor: LightColorTokens.redShade50.withAlpha(31),
    dayPeriodBackground: LightColorTokens.greenShade300.withAlpha(31),
    dayPeriodBorderColor: LightColorTokens.neutralShade150.withAlpha(191),
    selectedPeriodTextColor: LightColorTokens.greenShade100,
    unselectedPeriodTextColor: LightColorTokens.neutralShade650,
    helpTextColor: LightColorTokens.neutralShade850,
    buttonTextColor: LightColorTokens.greenShade100,
    buttonHoverColor: LightColorTokens.greenShade300.withAlpha(31),
    entryModeIconColor: LightColorTokens.neutralShade850,
  ),
};

TimePickerThemeData _timePickerTheme({
  required BuildContext context,
  required Color dialogBackgroundColor,
  required Color dialBackgroundColor,
  required Color dialHandColor,
  required Color separatorColor,
  required Color selectedDialTextColor,
  required Color unselectedDialTextColor,
  required Color selectedHourMinuteTextColor,
  required Color unselectedHourMinuteTextColor,
  required InputDecorationTheme inputDecorationTheme,
  required Color inputFieldColor,
  required Color selectedInputColor,
  required Color errorInputColor,
  required Color dayPeriodBackground,
  required Color dayPeriodBorderColor,
  required Color selectedPeriodTextColor,
  required Color unselectedPeriodTextColor,
  required Color helpTextColor,
  required Color buttonTextColor,
  required Color buttonHoverColor,
  required Color entryModeIconColor,
}) {
  return TimePickerThemeData(
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
    dayPeriodBorderSide: BorderSide(color: dayPeriodBorderColor),
    dayPeriodColor: dayPeriodBackground,
    dayPeriodTextColor: WidgetStateColor.resolveWith((states) {
      if (states.contains(WidgetState.selected)) {
        return selectedPeriodTextColor;
      } else {
        return unselectedPeriodTextColor;
      }
    }),
    dayPeriodTextStyle: TextStyle(
      fontSize: context.scale(14),
      fontWeight: FontWeight.w600,
    ),
    dayPeriodShape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(context.scale(6)),
    ),
    dialBackgroundColor: dialBackgroundColor,
    dialHandColor: dialHandColor,
    dialTextColor: WidgetStateColor.resolveWith((states) {
      if (states.contains(WidgetState.selected)) {
        return selectedDialTextColor;
      } else {
        return unselectedDialTextColor;
      }
    }),
    elevation: 0,
    entryModeIconColor: entryModeIconColor,
    helpTextStyle: TextStyle(
      color: helpTextColor,
      fontSize: context.scale(14),
      fontWeight: FontWeight.w500,
    ),
    hourMinuteColor: WidgetStateColor.resolveWith((states) {
      if (states.contains(WidgetState.selected)) {
        return selectedInputColor;
      } else if (states.contains(WidgetState.error)) {
        return errorInputColor;
      } else {
        return inputFieldColor;
      }
    }),
    hourMinuteShape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(context.scale(6)),
    ),
    hourMinuteTextColor: WidgetStateColor.resolveWith((states) {
      if (states.contains(WidgetState.selected)) {
        return selectedHourMinuteTextColor;
      } else {
        return unselectedHourMinuteTextColor;
      }
    }),
    inputDecorationTheme: inputDecorationTheme.copyWith(
      contentPadding: EdgeInsets.zero,
    ),
    padding: EdgeInsets.all(context.scale(24)),
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(context.scale(16)),
    ),
    timeSelectorSeparatorColor: WidgetStatePropertyAll(separatorColor),
  );
}
