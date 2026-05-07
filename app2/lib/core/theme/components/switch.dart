// lib/core/theme/components/switch.dart

import 'package:flutter/material.dart';

import '../foundation/colors/dark_color_tokens.dart';
import '../foundation/colors/light_color_tokens.dart';

Map<String, SwitchThemeData> switchTheme = {
  'Dark': _switchTheme(
    overlayColor: DarkColorTokens.greenShade300.withAlpha(63),
    thumbColorPressedSelected: DarkColorTokens.neutralShade450.withAlpha(127),
    thumbColorPressedUnselected: DarkColorTokens.neutralShade650.withAlpha(127),
    thumbColorSelected: DarkColorTokens.neutralShade350.withAlpha(127),
    thumbColorUnselected: DarkColorTokens.neutralShade750.withAlpha(127),
    trackColorSelected: DarkColorTokens.greenShade100,
    trackColorUnselected: DarkColorTokens.neutralShade350.withAlpha(127),
    trackOutlinePressedSelected: DarkColorTokens.greenShade50,
    trackOutlinePressedUnselected: DarkColorTokens.neutralShade450.withAlpha(127),
    trackOutlineSelected: DarkColorTokens.greenShade100,
    trackOutlineUnselected: DarkColorTokens.neutralShade750.withAlpha(127),
  ),
  'Light': _switchTheme(
    overlayColor: LightColorTokens.greenShade300.withAlpha(63),
    thumbColorPressedSelected: LightColorTokens.neutralShade150,
    thumbColorPressedUnselected: LightColorTokens.neutralShade350,
    thumbColorSelected: LightColorTokens.neutralShade100,
    thumbColorUnselected: LightColorTokens.neutralShade450,
    trackColorSelected: LightColorTokens.greenShade100,
    trackColorUnselected: LightColorTokens.neutralShade100,
    trackOutlinePressedSelected: LightColorTokens.greenShade50,
    trackOutlinePressedUnselected: LightColorTokens.neutralShade250,
    trackOutlineSelected: LightColorTokens.greenShade100,
    trackOutlineUnselected: LightColorTokens.neutralShade450,
  ),
};

SwitchThemeData _switchTheme({
  required Color overlayColor,
  required Color thumbColorPressedSelected,
  required Color thumbColorPressedUnselected,
  required Color thumbColorSelected,
  required Color thumbColorUnselected,
  required Color trackColorSelected,
  required Color trackColorUnselected,
  required Color trackOutlinePressedSelected,
  required Color trackOutlinePressedUnselected,
  required Color trackOutlineSelected,
  required Color trackOutlineUnselected,
}) {
  return SwitchThemeData(
    overlayColor: WidgetStatePropertyAll(overlayColor),
    thumbColor: WidgetStateColor.resolveWith((states) {
      if (states.contains(WidgetState.pressed)) {
        if (states.contains(WidgetState.selected)) {
          return thumbColorPressedSelected;
        } else {
          return thumbColorPressedUnselected;
        }
      } else if (states.contains(WidgetState.selected)) {
        return thumbColorSelected;
      } else {
        return thumbColorUnselected;
      }
    }),
    trackColor: WidgetStateColor.resolveWith((states) {
      if (states.contains(WidgetState.selected)) {
        return trackColorSelected;
      } else {
        return trackColorUnselected;
      }
    }),
    trackOutlineColor: WidgetStateColor.resolveWith((states) {
      if (states.contains(WidgetState.pressed)) {
        if (states.contains(WidgetState.selected)) {
          return trackOutlinePressedSelected;
        } else {
          return trackOutlinePressedUnselected;
        }
      } else if (states.contains(WidgetState.selected)) {
        return trackOutlineSelected;
      } else {
        return trackOutlineUnselected;
      }
    }),
  );
}
