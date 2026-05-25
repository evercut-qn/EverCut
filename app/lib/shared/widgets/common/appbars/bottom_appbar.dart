// lib/shared/widgets/common/appbars/bottom_appbar.dart

import 'package:flutter/material.dart';

import '../../../extensions/context/app_colors_extension.dart';

class CustomBottomAppBar extends StatelessWidget {
  final Widget? child;
  final EdgeInsets? padding;

  const CustomBottomAppBar({
    super.key,
    this.child,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      shape: Border(
        top: BorderSide(
          color: context.appColors.primaryDividerColor,
        ),
      ),
      child: BottomAppBar(
        padding: padding,
        child: child,
      ),
    );
  }
}
