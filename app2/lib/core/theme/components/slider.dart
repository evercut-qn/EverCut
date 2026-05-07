// lib/core/theme/components/slider.dart

import 'package:flutter/material.dart';

import '../foundation/colors/dark_color_tokens.dart';
import '../foundation/colors/light_color_tokens.dart';

Map<String, SliderThemeData> sliderTheme = {
  'Dark': _sliderTheme(
    activeTrackColor: DarkColorTokens.greenShade100,
    activeTickMarkColor: DarkColorTokens.neutralShade50,
    overlayColor: DarkColorTokens.greenShade300.withAlpha(31),
    inactiveTrackColor: DarkColorTokens.greenShade300.withAlpha(31),
    inactiveTickMarkColor: DarkColorTokens.greenShade100,
    thumbColor: DarkColorTokens.greenShade100,
    valueIndicatorColor: DarkColorTokens.greenShade100,
    valueIndicatorTextColor: DarkColorTokens.neutralShade50,
  ),
  'Light': _sliderTheme(
    activeTrackColor: LightColorTokens.greenShade100,
    activeTickMarkColor: LightColorTokens.neutralShade50,
    overlayColor: LightColorTokens.greenShade300.withAlpha(31),
    inactiveTrackColor: LightColorTokens.greenShade300.withAlpha(31),
    inactiveTickMarkColor: LightColorTokens.greenShade100,
    thumbColor: LightColorTokens.greenShade100,
    valueIndicatorColor: LightColorTokens.greenShade100,
    valueIndicatorTextColor: LightColorTokens.neutralShade50,
  ),
};

SliderThemeData _sliderTheme({
  required Color activeTrackColor,
  required Color activeTickMarkColor,
  required Color overlayColor,
  required Color inactiveTrackColor,
  required Color inactiveTickMarkColor,
  required Color thumbColor,
  required Color valueIndicatorColor,
  required Color valueIndicatorTextColor,
}) {
  return SliderThemeData(
    activeTrackColor: activeTrackColor,
    activeTickMarkColor: activeTickMarkColor,
    overlayColor: overlayColor,
    inactiveTrackColor: inactiveTrackColor,
    inactiveTickMarkColor: inactiveTickMarkColor,
    thumbColor: thumbColor,
    valueIndicatorColor: valueIndicatorColor,
    valueIndicatorTextStyle: TextStyle(
      color: valueIndicatorTextColor,
    ),
  );
}
