// lib/shared/widgets/other/weekday_selector/weekday_selector.dart

import 'package:flutter/material.dart';

import '../../../extensions/context/app_colors_extension.dart';
import '../../../extensions/context/device_metrics_extension.dart';
import '../../../extensions/other/set_extension.dart';

enum Weekday {
  sunday,
  monday,
  tuesday,
  wednesday,
  thursday,
  friday,
  saturday,
}

extension _WeekdayExtension on Weekday {
  String get label {
    switch (this) {
      case Weekday.sunday:
        return 'Sunday';
      case Weekday.monday:
        return 'Monday';
      case Weekday.tuesday:
        return 'Tuesday';
      case Weekday.wednesday:
        return 'Wednesday';
      case Weekday.thursday:
        return 'Thursday';
      case Weekday.friday:
        return 'Friday';
      case Weekday.saturday:
        return 'Saturday';
    }
  }
}

class WeekdaySelector extends StatefulWidget {
  final Set<Weekday> initialSelectedDays;
  final ValueSetter<Set<Weekday>>? onSelectionChanged;

  const WeekdaySelector({
    super.key,
    this.initialSelectedDays = const {},
    this.onSelectionChanged,
  });

  @override
  State<WeekdaySelector> createState() => _WeekdaySelectorState();
}

class _WeekdaySelectorState extends State<WeekdaySelector> {
  final Set<Weekday> _selectedDays = <Weekday>{};

  @override
  void initState() {
    super.initState();
    _selectedDays.addAll(Set.from(widget.initialSelectedDays));
  }

  void _toggleWeekday(Weekday weekday) {
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
      children: Weekday.values.map((Weekday weekday) {
        final isSelected = _selectedDays.contains(weekday);
        return Material(
          color: isSelected ? context.appColors.greenShade100 : Theme.of(context).inputDecorationTheme.fillColor,
          clipBehavior: Clip.hardEdge,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(context.scale(8)),
          ),
          child: InkWell(
            onTap: () => _toggleWeekday(weekday),
            overlayColor: WidgetStateColor.transparent,
            splashFactory: NoSplash.splashFactory,
            child: Padding(
              padding: EdgeInsets.symmetric(
                horizontal: context.scale(16),
                vertical: context.scale(12),
              ),
              child: Text(
                weekday.label,
                style: TextStyle(
                  color: isSelected ? Theme.of(context).scaffoldBackgroundColor : null,
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
