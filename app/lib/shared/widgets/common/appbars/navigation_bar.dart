// lib/shared/widgets/common/appbars/navigation_bar.dart

import 'package:flutter/material.dart';

import '../../../extensions/context/app_colors_extension.dart';

class CustomNavigationBar extends StatelessWidget {
  final List<NavigationDestination> destinations;
  final ValueChanged<int> onDestinationSelected;
  final int selectedIndex;

  const CustomNavigationBar({
    super.key,
    required this.destinations,
    required this.onDestinationSelected,
    required this.selectedIndex,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      shape: Border(
        top: BorderSide(
          color: context.appColors.primaryDividerColor,
        ),
      ),
      child: NavigationBar(
        destinations: destinations,
        indicatorColor: Colors.transparent,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysHide,
        onDestinationSelected: onDestinationSelected,
        overlayColor: WidgetStateColor.transparent,
        selectedIndex: selectedIndex,
      ),
    );
  }
}
