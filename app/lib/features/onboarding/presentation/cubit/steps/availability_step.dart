// lib/features/onboarding/presentation/cubit/steps/availability_step.dart

import '../../../../../shared/enums/weekday.dart';
import '../../../../../shared/models/scheduling/break_time.dart';

class AvailabilityStep {
  final Set<WeekdayEnum> workingDays;
  final String openTime;
  final String closeTime;
  final Set<BreakTimeModel> breaks;

  const AvailabilityStep({
    this.workingDays = const {},
    this.openTime = '',
    this.closeTime = '',
    this.breaks = const {},
  });

  AvailabilityStep copyWith({
    Set<WeekdayEnum>? workingDays,
    String? openTime,
    String? closeTime,
    Set<BreakTimeModel>? breaks,
  }) {
    return AvailabilityStep(
      workingDays: workingDays ?? this.workingDays,
      openTime: openTime ?? this.openTime,
      closeTime: closeTime ?? this.closeTime,
      breaks: breaks ?? this.breaks,
    );
  }
}
