// lib/shared/widgets/common/appbars/bottom_navigation_bar.dart

import 'package:flutter/material.dart';

import '../../../extensions/context/app_colors_extension.dart';
import '../../../extensions/context/device_metrics_extension.dart';

class CustomBottomNavigationDestination {
  final IconData icon;
  final IconData selectedIcon;
  final String label;

  const CustomBottomNavigationDestination({
    required this.icon,
    required this.selectedIcon,
    required this.label,
  });
}

class CustomBottomNavigationBar extends StatefulWidget {
  final List<CustomBottomNavigationDestination> destinations;
  final ValueChanged<int> onDestinationSelected;
  final int selectedIndex;

  const CustomBottomNavigationBar({
    super.key,
    required this.destinations,
    required this.onDestinationSelected,
    required this.selectedIndex,
  }) : assert(destinations.length >= 2, 'destinations must contain at least 2 items'),
       assert(0 <= selectedIndex && selectedIndex < destinations.length, 'selectedIndex must be between 0 and destinations.length - 1');

  @override
  State<CustomBottomNavigationBar> createState() => _CustomBottomNavigationBarState();
}

class _CustomBottomNavigationBarState extends State<CustomBottomNavigationBar> {
  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      shape: Border(
        top: BorderSide(color: context.appColors.primaryDividerColor),
      ),
      child: BottomAppBar(
        padding: EdgeInsets.all(context.scale(12)),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: List.generate(widget.destinations.length, (int index) {
            final CustomBottomNavigationDestination destination = widget.destinations[index];
            final bool isSelected = index == widget.selectedIndex;
            return Material(
              borderRadius: BorderRadius.circular(context.scale(8)),
              clipBehavior: Clip.hardEdge,
              color: Colors.transparent,
              child: InkWell(
                highlightColor: isSelected ? context.appColors.greenShade100.withAlpha(15) : context.appColors.backgroundShade200.withAlpha(127),
                onTap: () => widget.onDestinationSelected(index),
                splashColor: isSelected ? context.appColors.greenShade100.withAlpha(31) : context.appColors.backgroundShade200.withAlpha(191),
                child: AnimatedContainer(
                  decoration: BoxDecoration(
                    color: isSelected ? context.appColors.greenShade100.withAlpha(31) : null,
                    borderRadius: BorderRadius.circular(context.scale(8)),
                  ),
                  duration: const Duration(milliseconds: 300),
                  curve: Curves.easeInOut,
                  padding: EdgeInsets.all(context.scale(12)),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        curve: Curves.easeInOut,
                        margin: EdgeInsets.only(right: isSelected ? context.scale(8) : 0.0),
                        child: Icon(
                          isSelected ? destination.selectedIcon : destination.icon,
                          color: isSelected ? context.appColors.greenShade300 : context.appColors.neutralShade650,
                          size: context.scale(20),
                        ),
                      ),
                      if (isSelected) ...[
                        AnimatedOpacity(
                          duration: const Duration(milliseconds: 300),
                          opacity: isSelected ? 1.0 : 0.0,
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 300),
                            curve: Curves.easeInOut,
                            width: isSelected ? null : 0.0,
                            child: Text(
                              destination.label,
                              style: TextStyle(
                                fontSize: context.scale(12),
                                color: context.appColors.greenShade300,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            );
          }),
        ),
      ),
    );
  }
}
