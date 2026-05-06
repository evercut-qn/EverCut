// lib/core/theme/foundation/app_colors.dart

import 'package:flutter/material.dart';

@immutable
class AppColors extends ThemeExtension<AppColors> {
  final Color redShade50;
  final Color redShade100;
  final Color redShade200;
  final Color redShade300;
  final Color redShade400;
  final Color redShade500;
  final Color redShade600;
  final Color redShade700;
  final Color redShade800;
  final Color redShade900;
  final Color redShade950;

  final Color blueShade50;
  final Color blueShade100;
  final Color blueShade200;
  final Color blueShade300;
  final Color blueShade400;
  final Color blueShade500;
  final Color blueShade600;
  final Color blueShade700;
  final Color blueShade800;
  final Color blueShade900;
  final Color blueShade950;

  final Color greenShade50;
  final Color greenShade100;
  final Color greenShade200;
  final Color greenShade300;
  final Color greenShade400;
  final Color greenShade500;
  final Color greenShade600;
  final Color greenShade700;
  final Color greenShade800;
  final Color greenShade900;
  final Color greenShade950;

  final Color orangeShade50;
  final Color orangeShade100;
  final Color orangeShade200;
  final Color orangeShade300;
  final Color orangeShade400;
  final Color orangeShade500;
  final Color orangeShade600;
  final Color orangeShade700;
  final Color orangeShade800;
  final Color orangeShade900;
  final Color orangeShade950;

  final Color neutralShade50;
  final Color neutralShade100;
  final Color neutralShade150;
  final Color neutralShade200;
  final Color neutralShade250;
  final Color neutralShade300;
  final Color neutralShade350;
  final Color neutralShade400;
  final Color neutralShade450;
  final Color neutralShade500;
  final Color neutralShade550;
  final Color neutralShade600;
  final Color neutralShade650;
  final Color neutralShade700;
  final Color neutralShade750;
  final Color neutralShade800;
  final Color neutralShade850;
  final Color neutralShade900;
  final Color neutralShade950;
  final Color neutralShade1000;
  final Color neutralShade1050;

  final Color backgroundShade50;
  final Color backgroundShade75;
  final Color backgroundShade100;
  final Color backgroundShade200;
  final Color backgroundShade300;
  final Color backgroundShade400;
  final Color backgroundShade500;
  final Color backgroundShade600;
  final Color backgroundShade700;
  final Color backgroundShade800;
  final Color backgroundShade900;
  final Color backgroundShade950;

  final Color appBarBackgroundColor;
  final Color bottomAppBarBackgroundColor;
  final Color bottomsheetBackgroundColor;
  final Color datePickerBackgroundColor;
  final Color primaryDividerColor;
  final Color secondaryDividerColor;
  final Color dialogBackgroundColor;
  final Color dropdownMenuBackgroundColor;
  final Color navigationBarBackgroundColor;
  final Color popupMenuBackgroundColor;
  final Color popupMenuDividerColor;
  final Color scaffoldBackgroundColor;
  final Color timePickerBackgroundColor;

  const AppColors({
    required this.redShade50,
    required this.redShade100,
    required this.redShade200,
    required this.redShade300,
    required this.redShade400,
    required this.redShade500,
    required this.redShade600,
    required this.redShade700,
    required this.redShade800,
    required this.redShade900,
    required this.redShade950,
    required this.blueShade50,
    required this.blueShade100,
    required this.blueShade200,
    required this.blueShade300,
    required this.blueShade400,
    required this.blueShade500,
    required this.blueShade600,
    required this.blueShade700,
    required this.blueShade800,
    required this.blueShade900,
    required this.blueShade950,
    required this.greenShade50,
    required this.greenShade100,
    required this.greenShade200,
    required this.greenShade300,
    required this.greenShade400,
    required this.greenShade500,
    required this.greenShade600,
    required this.greenShade700,
    required this.greenShade800,
    required this.greenShade900,
    required this.greenShade950,
    required this.orangeShade50,
    required this.orangeShade100,
    required this.orangeShade200,
    required this.orangeShade300,
    required this.orangeShade400,
    required this.orangeShade500,
    required this.orangeShade600,
    required this.orangeShade700,
    required this.orangeShade800,
    required this.orangeShade900,
    required this.orangeShade950,
    required this.neutralShade50,
    required this.neutralShade100,
    required this.neutralShade150,
    required this.neutralShade200,
    required this.neutralShade250,
    required this.neutralShade300,
    required this.neutralShade350,
    required this.neutralShade400,
    required this.neutralShade450,
    required this.neutralShade500,
    required this.neutralShade550,
    required this.neutralShade600,
    required this.neutralShade650,
    required this.neutralShade700,
    required this.neutralShade750,
    required this.neutralShade800,
    required this.neutralShade850,
    required this.neutralShade900,
    required this.neutralShade950,
    required this.neutralShade1000,
    required this.neutralShade1050,
    required this.backgroundShade50,
    required this.backgroundShade75,
    required this.backgroundShade100,
    required this.backgroundShade200,
    required this.backgroundShade300,
    required this.backgroundShade400,
    required this.backgroundShade500,
    required this.backgroundShade600,
    required this.backgroundShade700,
    required this.backgroundShade800,
    required this.backgroundShade900,
    required this.backgroundShade950,
    required this.appBarBackgroundColor,
    required this.bottomAppBarBackgroundColor,
    required this.bottomsheetBackgroundColor,
    required this.datePickerBackgroundColor,
    required this.primaryDividerColor,
    required this.secondaryDividerColor,
    required this.dialogBackgroundColor,
    required this.dropdownMenuBackgroundColor,
    required this.navigationBarBackgroundColor,
    required this.popupMenuBackgroundColor,
    required this.popupMenuDividerColor,
    required this.scaffoldBackgroundColor,
    required this.timePickerBackgroundColor,
  });

  @override
  AppColors copyWith({
    Color? redShade50,
    Color? redShade100,
    Color? redShade200,
    Color? redShade300,
    Color? redShade400,
    Color? redShade500,
    Color? redShade600,
    Color? redShade700,
    Color? redShade800,
    Color? redShade900,
    Color? redShade950,
    Color? blueShade50,
    Color? blueShade100,
    Color? blueShade200,
    Color? blueShade300,
    Color? blueShade400,
    Color? blueShade500,
    Color? blueShade600,
    Color? blueShade700,
    Color? blueShade800,
    Color? blueShade900,
    Color? blueShade950,
    Color? greenShade50,
    Color? greenShade100,
    Color? greenShade200,
    Color? greenShade300,
    Color? greenShade400,
    Color? greenShade500,
    Color? greenShade600,
    Color? greenShade700,
    Color? greenShade800,
    Color? greenShade900,
    Color? greenShade950,
    Color? orangeShade50,
    Color? orangeShade100,
    Color? orangeShade200,
    Color? orangeShade300,
    Color? orangeShade400,
    Color? orangeShade500,
    Color? orangeShade600,
    Color? orangeShade700,
    Color? orangeShade800,
    Color? orangeShade900,
    Color? orangeShade950,
    Color? neutralShade50,
    Color? neutralShade100,
    Color? neutralShade150,
    Color? neutralShade200,
    Color? neutralShade250,
    Color? neutralShade300,
    Color? neutralShade350,
    Color? neutralShade400,
    Color? neutralShade450,
    Color? neutralShade500,
    Color? neutralShade550,
    Color? neutralShade600,
    Color? neutralShade650,
    Color? neutralShade700,
    Color? neutralShade750,
    Color? neutralShade800,
    Color? neutralShade850,
    Color? neutralShade900,
    Color? neutralShade950,
    Color? neutralShade1000,
    Color? neutralShade1050,
    Color? backgroundShade50,
    Color? backgroundShade75,
    Color? backgroundShade100,
    Color? backgroundShade200,
    Color? backgroundShade300,
    Color? backgroundShade400,
    Color? backgroundShade500,
    Color? backgroundShade600,
    Color? backgroundShade700,
    Color? backgroundShade800,
    Color? backgroundShade900,
    Color? backgroundShade950,
    Color? appBarBackgroundColor,
    Color? bottomAppBarBackgroundColor,
    Color? bottomsheetBackgroundColor,
    Color? datePickerBackgroundColor,
    Color? primaryDividerColor,
    Color? secondaryDividerColor,
    Color? dialogBackgroundColor,
    Color? dropdownMenuBackgroundColor,
    Color? navigationBarBackgroundColor,
    Color? popupMenuBackgroundColor,
    Color? popupMenuDividerColor,
    Color? scaffoldBackgroundColor,
    Color? timePickerBackgroundColor,
  }) {
    return AppColors(
      redShade50: redShade50 ?? this.blueShade50,
      redShade100: redShade100 ?? this.blueShade100,
      redShade200: redShade200 ?? this.blueShade200,
      redShade300: redShade300 ?? this.blueShade300,
      redShade400: redShade400 ?? this.blueShade400,
      redShade500: redShade500 ?? this.blueShade500,
      redShade600: redShade600 ?? this.blueShade600,
      redShade700: redShade700 ?? this.blueShade700,
      redShade800: redShade800 ?? this.blueShade800,
      redShade900: redShade900 ?? this.blueShade900,
      redShade950: redShade950 ?? this.blueShade950,
      blueShade50: blueShade50 ?? this.blueShade50,
      blueShade100: blueShade100 ?? this.blueShade100,
      blueShade200: blueShade200 ?? this.blueShade200,
      blueShade300: blueShade300 ?? this.blueShade300,
      blueShade400: blueShade400 ?? this.blueShade400,
      blueShade500: blueShade500 ?? this.blueShade500,
      blueShade600: blueShade600 ?? this.blueShade600,
      blueShade700: blueShade700 ?? this.blueShade700,
      blueShade800: blueShade800 ?? this.blueShade800,
      blueShade900: blueShade900 ?? this.blueShade900,
      blueShade950: blueShade950 ?? this.blueShade950,
      greenShade50: greenShade50 ?? this.greenShade50,
      greenShade100: greenShade100 ?? this.greenShade100,
      greenShade200: greenShade200 ?? this.greenShade200,
      greenShade300: greenShade300 ?? this.greenShade300,
      greenShade400: greenShade400 ?? this.greenShade400,
      greenShade500: greenShade500 ?? this.greenShade500,
      greenShade600: greenShade600 ?? this.greenShade600,
      greenShade700: greenShade700 ?? this.greenShade700,
      greenShade800: greenShade800 ?? this.greenShade800,
      greenShade900: greenShade900 ?? this.greenShade900,
      greenShade950: greenShade950 ?? this.greenShade950,
      orangeShade50: orangeShade50 ?? this.orangeShade50,
      orangeShade100: orangeShade100 ?? this.orangeShade100,
      orangeShade200: orangeShade200 ?? this.orangeShade200,
      orangeShade300: orangeShade300 ?? this.orangeShade300,
      orangeShade400: orangeShade400 ?? this.orangeShade400,
      orangeShade500: orangeShade500 ?? this.orangeShade500,
      orangeShade600: orangeShade600 ?? this.orangeShade600,
      orangeShade700: orangeShade700 ?? this.orangeShade700,
      orangeShade800: orangeShade800 ?? this.orangeShade800,
      orangeShade900: orangeShade900 ?? this.orangeShade900,
      orangeShade950: orangeShade950 ?? this.orangeShade950,
      neutralShade50: neutralShade50 ?? this.neutralShade50,
      neutralShade100: neutralShade100 ?? this.neutralShade100,
      neutralShade150: neutralShade150 ?? this.neutralShade150,
      neutralShade200: neutralShade200 ?? this.neutralShade200,
      neutralShade250: neutralShade250 ?? this.neutralShade250,
      neutralShade300: neutralShade300 ?? this.neutralShade300,
      neutralShade350: neutralShade350 ?? this.neutralShade350,
      neutralShade400: neutralShade400 ?? this.neutralShade400,
      neutralShade450: neutralShade450 ?? this.neutralShade450,
      neutralShade500: neutralShade500 ?? this.neutralShade500,
      neutralShade550: neutralShade550 ?? this.neutralShade550,
      neutralShade600: neutralShade600 ?? this.neutralShade600,
      neutralShade650: neutralShade650 ?? this.neutralShade650,
      neutralShade700: neutralShade700 ?? this.neutralShade700,
      neutralShade750: neutralShade750 ?? this.neutralShade750,
      neutralShade800: neutralShade800 ?? this.neutralShade800,
      neutralShade850: neutralShade850 ?? this.neutralShade850,
      neutralShade900: neutralShade900 ?? this.neutralShade900,
      neutralShade950: neutralShade950 ?? this.neutralShade950,
      neutralShade1000: neutralShade1000 ?? this.neutralShade1000,
      neutralShade1050: neutralShade1050 ?? this.neutralShade1050,
      backgroundShade50: backgroundShade50 ?? this.backgroundShade50,
      backgroundShade75: backgroundShade75 ?? this.backgroundShade75,
      backgroundShade100: backgroundShade100 ?? this.backgroundShade100,
      backgroundShade200: backgroundShade200 ?? this.backgroundShade200,
      backgroundShade300: backgroundShade300 ?? this.backgroundShade300,
      backgroundShade400: backgroundShade400 ?? this.backgroundShade400,
      backgroundShade500: backgroundShade500 ?? this.backgroundShade500,
      backgroundShade600: backgroundShade600 ?? this.backgroundShade600,
      backgroundShade700: backgroundShade700 ?? this.backgroundShade700,
      backgroundShade800: backgroundShade800 ?? this.backgroundShade800,
      backgroundShade900: backgroundShade900 ?? this.backgroundShade900,
      backgroundShade950: backgroundShade950 ?? this.backgroundShade950,
      appBarBackgroundColor: appBarBackgroundColor ?? this.appBarBackgroundColor,
      bottomAppBarBackgroundColor: bottomAppBarBackgroundColor ?? this.bottomAppBarBackgroundColor,
      bottomsheetBackgroundColor: bottomsheetBackgroundColor ?? this.bottomsheetBackgroundColor,
      datePickerBackgroundColor: datePickerBackgroundColor ?? this.datePickerBackgroundColor,
      primaryDividerColor: primaryDividerColor ?? this.primaryDividerColor,
      secondaryDividerColor: secondaryDividerColor ?? this.secondaryDividerColor,
      dialogBackgroundColor: dialogBackgroundColor ?? this.dialogBackgroundColor,
      dropdownMenuBackgroundColor: dropdownMenuBackgroundColor ?? this.dropdownMenuBackgroundColor,
      navigationBarBackgroundColor: navigationBarBackgroundColor ?? this.navigationBarBackgroundColor,
      popupMenuBackgroundColor: popupMenuBackgroundColor ?? this.popupMenuBackgroundColor,
      popupMenuDividerColor: popupMenuDividerColor ?? this.popupMenuDividerColor,
      scaffoldBackgroundColor: scaffoldBackgroundColor ?? this.scaffoldBackgroundColor,
      timePickerBackgroundColor: timePickerBackgroundColor ?? this.timePickerBackgroundColor,
    );
  }

  @override
  AppColors lerp(covariant ThemeExtension<AppColors>? other, double t) {
    if (other is! AppColors) return this;
    return AppColors(
      redShade50: Color.lerp(redShade50, other.redShade50, t)!,
      redShade100: Color.lerp(redShade100, other.redShade100, t)!,
      redShade200: Color.lerp(redShade200, other.redShade200, t)!,
      redShade300: Color.lerp(redShade300, other.redShade300, t)!,
      redShade400: Color.lerp(redShade400, other.redShade400, t)!,
      redShade500: Color.lerp(redShade500, other.redShade500, t)!,
      redShade600: Color.lerp(redShade600, other.redShade600, t)!,
      redShade700: Color.lerp(redShade700, other.redShade700, t)!,
      redShade800: Color.lerp(redShade800, other.redShade800, t)!,
      redShade900: Color.lerp(redShade900, other.redShade900, t)!,
      redShade950: Color.lerp(redShade950, other.redShade950, t)!,
      blueShade50: Color.lerp(blueShade50, other.blueShade50, t)!,
      blueShade100: Color.lerp(blueShade100, other.blueShade100, t)!,
      blueShade200: Color.lerp(blueShade200, other.blueShade200, t)!,
      blueShade300: Color.lerp(blueShade300, other.blueShade300, t)!,
      blueShade400: Color.lerp(blueShade400, other.blueShade400, t)!,
      blueShade500: Color.lerp(blueShade500, other.blueShade500, t)!,
      blueShade600: Color.lerp(blueShade600, other.blueShade600, t)!,
      blueShade700: Color.lerp(blueShade700, other.blueShade700, t)!,
      blueShade800: Color.lerp(blueShade800, other.blueShade800, t)!,
      blueShade900: Color.lerp(blueShade900, other.blueShade900, t)!,
      blueShade950: Color.lerp(blueShade950, other.blueShade950, t)!,
      greenShade50: Color.lerp(greenShade50, other.greenShade50, t)!,
      greenShade100: Color.lerp(greenShade100, other.greenShade100, t)!,
      greenShade200: Color.lerp(greenShade200, other.greenShade200, t)!,
      greenShade300: Color.lerp(greenShade300, other.greenShade300, t)!,
      greenShade400: Color.lerp(greenShade400, other.greenShade400, t)!,
      greenShade500: Color.lerp(greenShade500, other.greenShade500, t)!,
      greenShade600: Color.lerp(greenShade600, other.greenShade600, t)!,
      greenShade700: Color.lerp(greenShade700, other.greenShade700, t)!,
      greenShade800: Color.lerp(greenShade800, other.greenShade800, t)!,
      greenShade900: Color.lerp(greenShade900, other.greenShade900, t)!,
      greenShade950: Color.lerp(greenShade950, other.greenShade950, t)!,
      orangeShade50: Color.lerp(orangeShade50, other.orangeShade50, t)!,
      orangeShade100: Color.lerp(orangeShade100, other.orangeShade100, t)!,
      orangeShade200: Color.lerp(orangeShade200, other.orangeShade200, t)!,
      orangeShade300: Color.lerp(orangeShade300, other.orangeShade300, t)!,
      orangeShade400: Color.lerp(orangeShade400, other.orangeShade400, t)!,
      orangeShade500: Color.lerp(orangeShade500, other.orangeShade500, t)!,
      orangeShade600: Color.lerp(orangeShade600, other.orangeShade600, t)!,
      orangeShade700: Color.lerp(orangeShade700, other.orangeShade700, t)!,
      orangeShade800: Color.lerp(orangeShade800, other.orangeShade800, t)!,
      orangeShade900: Color.lerp(orangeShade900, other.orangeShade900, t)!,
      orangeShade950: Color.lerp(orangeShade950, other.orangeShade950, t)!,
      neutralShade50: Color.lerp(neutralShade50, other.neutralShade50, t)!,
      neutralShade100: Color.lerp(neutralShade100, other.neutralShade100, t)!,
      neutralShade150: Color.lerp(neutralShade150, other.neutralShade150, t)!,
      neutralShade200: Color.lerp(neutralShade200, other.neutralShade200, t)!,
      neutralShade250: Color.lerp(neutralShade250, other.neutralShade250, t)!,
      neutralShade300: Color.lerp(neutralShade300, other.neutralShade300, t)!,
      neutralShade350: Color.lerp(neutralShade350, other.neutralShade350, t)!,
      neutralShade400: Color.lerp(neutralShade400, other.neutralShade400, t)!,
      neutralShade450: Color.lerp(neutralShade450, other.neutralShade450, t)!,
      neutralShade500: Color.lerp(neutralShade500, other.neutralShade500, t)!,
      neutralShade550: Color.lerp(neutralShade550, other.neutralShade550, t)!,
      neutralShade600: Color.lerp(neutralShade600, other.neutralShade600, t)!,
      neutralShade650: Color.lerp(neutralShade650, other.neutralShade650, t)!,
      neutralShade700: Color.lerp(neutralShade700, other.neutralShade700, t)!,
      neutralShade750: Color.lerp(neutralShade750, other.neutralShade750, t)!,
      neutralShade800: Color.lerp(neutralShade800, other.neutralShade800, t)!,
      neutralShade850: Color.lerp(neutralShade850, other.neutralShade850, t)!,
      neutralShade900: Color.lerp(neutralShade900, other.neutralShade900, t)!,
      neutralShade950: Color.lerp(neutralShade950, other.neutralShade950, t)!,
      neutralShade1000: Color.lerp(neutralShade1000, other.neutralShade1000, t)!,
      neutralShade1050: Color.lerp(neutralShade1050, other.neutralShade1050, t)!,
      backgroundShade50: Color.lerp(backgroundShade50, other.backgroundShade50, t)!,
      backgroundShade75: Color.lerp(backgroundShade75, other.backgroundShade75, t)!,
      backgroundShade100: Color.lerp(backgroundShade100, other.backgroundShade100, t)!,
      backgroundShade200: Color.lerp(backgroundShade200, other.backgroundShade200, t)!,
      backgroundShade300: Color.lerp(backgroundShade300, other.backgroundShade300, t)!,
      backgroundShade400: Color.lerp(backgroundShade400, other.backgroundShade400, t)!,
      backgroundShade500: Color.lerp(backgroundShade500, other.backgroundShade500, t)!,
      backgroundShade600: Color.lerp(backgroundShade600, other.backgroundShade600, t)!,
      backgroundShade700: Color.lerp(backgroundShade700, other.backgroundShade700, t)!,
      backgroundShade800: Color.lerp(backgroundShade800, other.backgroundShade800, t)!,
      backgroundShade900: Color.lerp(backgroundShade900, other.backgroundShade900, t)!,
      backgroundShade950: Color.lerp(backgroundShade950, other.backgroundShade950, t)!,
      appBarBackgroundColor: Color.lerp(appBarBackgroundColor, other.appBarBackgroundColor, t)!,
      bottomAppBarBackgroundColor: Color.lerp(bottomAppBarBackgroundColor, other.bottomAppBarBackgroundColor, t)!,
      bottomsheetBackgroundColor: Color.lerp(bottomsheetBackgroundColor, other.bottomsheetBackgroundColor, t)!,
      datePickerBackgroundColor: Color.lerp(datePickerBackgroundColor, other.datePickerBackgroundColor, t)!,
      dialogBackgroundColor: Color.lerp(dialogBackgroundColor, other.dialogBackgroundColor, t)!,
      primaryDividerColor: Color.lerp(primaryDividerColor, other.primaryDividerColor, t)!,
      secondaryDividerColor: Color.lerp(secondaryDividerColor, other.secondaryDividerColor, t)!,
      dropdownMenuBackgroundColor: Color.lerp(dropdownMenuBackgroundColor, other.dropdownMenuBackgroundColor, t)!,
      navigationBarBackgroundColor: Color.lerp(navigationBarBackgroundColor, other.navigationBarBackgroundColor, t)!,
      popupMenuBackgroundColor: Color.lerp(popupMenuBackgroundColor, other.popupMenuBackgroundColor, t)!,
      popupMenuDividerColor: Color.lerp(popupMenuDividerColor, other.popupMenuDividerColor, t)!,
      scaffoldBackgroundColor: Color.lerp(scaffoldBackgroundColor, other.scaffoldBackgroundColor, t)!,
      timePickerBackgroundColor: Color.lerp(timePickerBackgroundColor, other.timePickerBackgroundColor, t)!,
    );
  }
}
