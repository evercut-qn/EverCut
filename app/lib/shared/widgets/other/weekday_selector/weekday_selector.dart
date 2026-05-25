// lib/shared/widgets/other/weekday_selector/weekday_selector.dart

import 'package:flutter/material.dart';

import '../../../enums/weekday.dart';
import '../../../extensions/context/app_colors_extension.dart';
import '../../../extensions/context/device_metrics_extension.dart';
import '../../../extensions/other/set_extension.dart';

class WeekdaySelector extends StatefulWidget {
  final Set<WeekdayEnum> initialSelectedDays;
  final ValueSetter<Set<WeekdayEnum>>? onSelectionChanged;

  const WeekdaySelector({
    super.key,
    this.initialSelectedDays = const {},
    this.onSelectionChanged,
  });

  @override
  State<WeekdaySelector> createState() => _WeekdaySelectorState();
}

class _WeekdaySelectorState extends State<WeekdaySelector> {
  final Set<WeekdayEnum> _selectedDays = <WeekdayEnum>{};

  @override
  void initState() {
    super.initState();
    _selectedDays.addAll(Set.from(widget.initialSelectedDays));
  }

  void _toggleWeekday(WeekdayEnum weekday) {
    setState(() {
      _selectedDays.toggle(weekday);
    });
    widget.onSelectionChanged?.call(_selectedDays);
  }

  @override
  Widget build(BuildContext context) {
    return Wrap(
      runSpacing: context.scale(16),
      spacing: context.scale(16),
      children: WeekdayEnum.values.map((WeekdayEnum weekday) {
        final isSelected = _selectedDays.contains(weekday);
        return Material(
          borderRadius: BorderRadius.circular(context.scale(8)),
          clipBehavior: Clip.hardEdge,
          color: isSelected ? context.appColors.greenShade100 : context.appColors.backgroundShade125,
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () => _toggleWeekday(weekday),
            child: Padding(
              padding: EdgeInsets.symmetric(
                horizontal: context.scale(16),
                vertical: context.scale(12),
              ),
              child: Text(
                weekday.label,
                style: TextStyle(
                  color: isSelected ? context.appColors.backgroundShade50 : context.appColors.neutralShade650,
                  fontSize: context.scale(14),
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}
