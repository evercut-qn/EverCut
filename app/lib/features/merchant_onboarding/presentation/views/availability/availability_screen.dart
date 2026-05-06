// lib/features/merchant_onboarding/presentation/views/availability/availability_screen.dart

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../../core/constants/regex/basic_regex.dart';
import '../../../../../core/theme/foundation/app_icons.dart';
import '../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../../shared/models/break_time.dart';
import '../../../../../shared/widgets/common/appbars/bottom_appbar.dart';
import '../../../../../shared/widgets/common/inputs/time_picker_field.dart';
import '../../../../../shared/widgets/other/weekday_selector/weekday_selector.dart';
import '../../../../../shared/widgets/overlays/snackbars.dart';
import '../../../../../shared/widgets/common/section/section_header.dart';
import '../../cubit/merchant_onboarding_cubit.dart';

class AvailabilityScreen extends StatefulWidget {
  const AvailabilityScreen({super.key});

  @override
  State<AvailabilityScreen> createState() => _AvailabilityScreenState();
}

class _AvailabilityScreenState extends State<AvailabilityScreen> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final GlobalKey<FormState> _breakFieldsFormKey = GlobalKey<FormState>();
  final TextEditingController _shopOpenTimeController = TextEditingController();
  final TextEditingController _shopCloseTimeController = TextEditingController();
  final TextEditingController _breakStartTimeController = TextEditingController();
  final TextEditingController _breakEndTimeController = TextEditingController();

  final Set<Weekday> _selectedDays = <Weekday>{};
  final Set<BreakTime> _breakTimings = <BreakTime>{};

  void _onAddBreakButtonPressed() {
    if (!_breakFieldsFormKey.currentState!.validate()) {
      SnackBars.of(context).showWarningSnackBar(
        title: 'Invalid Break Time',
        message: 'Please select both start and end times before adding a break period.',
      );
    } else {
      final breakStartTime = _breakStartTimeController.text;
      final breakEndTime = _breakEndTimeController.text;

      if (breakStartTime.isNotEmpty && breakEndTime.isNotEmpty) {
        final breakTime = BreakTime(
          startsAt: breakStartTime,
          endsAt: breakEndTime,
        );

        if (!_breakTimings.contains(breakTime)) {
          setState(() {
            _breakTimings.add(breakTime);
          });
        }

        _breakStartTimeController.clear();
        _breakEndTimeController.clear();

        FocusScope.of(context).unfocus();
      } else {
        SnackBars.of(context).showWarningSnackBar(
          title: 'Invalid Break Time',
          message: 'Please make sure to set both start and end times for your break period.',
        );
      }
    }
  }

  void _onBreakTimeDeleteIconTap(BreakTime breakTime) {
    if (_breakTimings.contains(breakTime)) {
      setState(() {
        _breakTimings.remove(breakTime);
      });
    }
  }

  void _onBackButtonPressed() => context.read<MerchantOnboardingCubit>().previousPage();
  void _onNextButtonPressed() {
    if (_selectedDays.isEmpty) {
      SnackBars.of(context).showWarningSnackBar(
        title: 'Working Days Required',
        message: 'Please select at least one working day to continue setting up your shop.',
      );
    } else {
      if (!_formKey.currentState!.validate()) {
        SnackBars.of(context).showWarningSnackBar(
          title: 'Working Hours Required',
          message: 'Please make sure to set both opening and closing times for your shop.',
        );
      } else {
        context.read<MerchantOnboardingCubit>().updateFields({
          'workingDays': _selectedDays.map(_weekdayLabel).toList(),
          'openTime': _toTwentyFourHourTime(_shopOpenTimeController.text),
          'closeTime': _toTwentyFourHourTime(_shopCloseTimeController.text),
          'breakTimes': _breakTimings
              .map((breakTime) => {
                    'start': _toTwentyFourHourTime(breakTime.startsAt),
                    'end': _toTwentyFourHourTime(breakTime.endsAt),
                  })
              .toList(),
        });
        context.read<MerchantOnboardingCubit>().nextPage();
      }
    }
  }

  String _toTwentyFourHourTime(String value) {
    final RegExp match = RegExp(r'^(\d{1,2}):(\d{2})\s*(AM|PM)$', caseSensitive: false);
    final RegExpMatch? result = match.firstMatch(value.trim());
    if (result == null) return value;

    int hour = int.parse(result.group(1)!);
    final String minute = result.group(2)!;
    final String meridiem = result.group(3)!.toUpperCase();
    if (meridiem == 'PM' && hour != 12) hour += 12;
    if (meridiem == 'AM' && hour == 12) hour = 0;
    return '${hour.toString().padLeft(2, '0')}:$minute';
  }

  String _weekdayLabel(Weekday weekday) {
    switch (weekday) {
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

  @override
  void dispose() {
    _shopOpenTimeController.dispose();
    _shopCloseTimeController.dispose();
    _breakStartTimeController.dispose();
    _breakEndTimeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: EdgeInsets.all(context.scale(24)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  spacing: context.scale(16),
                  children: [
                    const SectionHeader(
                      title: 'Working Days',
                      description: 'Select the days your shop operates and is available for appointments and bookings.',
                    ),
                    WeekdaySelector(
                      onSelectionChanged: (Set<Weekday> selectedDays) {
                        _selectedDays.clear();
                        _selectedDays.addAll(selectedDays);
                      },
                    ),
                  ],
                ),
              ),
              const Divider(height: 1.0),
              Padding(
                padding: EdgeInsets.all(context.scale(24)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  spacing: context.scale(16),
                  children: [
                    const SectionHeader(
                      title: 'Working Hours',
                      description: 'Set your shop\'s opening and closing hours that apply to selected working days.',
                    ),
                    Form(
                      autovalidateMode: AutovalidateMode.disabled,
                      key: _formKey,
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        spacing: context.scale(16),
                        children: [
                          Expanded(
                            child: TimePickerField(
                              controller: _shopOpenTimeController,
                              errorMaxLines: 3,
                              labelText: 'Opens At',
                              textCapitalization: TextCapitalization.none,
                              validator: (String? text) {
                                if (text == null || text.isEmpty) {
                                  return 'Please select your opening time.';
                                } else {
                                  if (!RegExp(BasicRegEx.time).hasMatch(text)) {
                                    return 'Please enter a valid time (e.g. 09:00 AM).';
                                  } else {
                                    return null;
                                  }
                                }
                              },
                            ),
                          ),
                          Expanded(
                            child: TimePickerField(
                              controller: _shopCloseTimeController,
                              errorMaxLines: 3,
                              labelText: 'Closes At',
                              textCapitalization: TextCapitalization.none,
                              validator: (String? text) {
                                if (text == null || text.isEmpty) {
                                  return 'Please select your closing time.';
                                } else {
                                  if (!RegExp(BasicRegEx.time).hasMatch(text)) {
                                    return 'Please enter a valid time (e.g. 06:00 PM).';
                                  } else {
                                    return null;
                                  }
                                }
                              },
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1.0),
              Padding(
                padding: EdgeInsets.all(context.scale(24)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  spacing: context.scale(16),
                  children: [
                    const SectionHeader(
                      title: 'Break Timings',
                      description: 'Set specific break periods during the day when your shop will be unavailable for service.',
                    ),
                    Form(
                      autovalidateMode: AutovalidateMode.disabled,
                      key: _breakFieldsFormKey,
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        spacing: context.scale(16),
                        children: [
                          Expanded(
                            child: TimePickerField(
                              controller: _breakStartTimeController,
                              errorMaxLines: 3,
                              labelText: 'Starts At',
                              textCapitalization: TextCapitalization.none,
                              validator: (String? text) {
                                if (text == null || text.isEmpty) {
                                  return 'Please select the break start time.';
                                } else {
                                  if (!RegExp(BasicRegEx.time).hasMatch(text)) {
                                    return 'Please enter a valid time (e.g. 01:00 PM).';
                                  } else {
                                    return null;
                                  }
                                }
                              },
                            ),
                          ),
                          Expanded(
                            child: TimePickerField(
                              controller: _breakEndTimeController,
                              errorMaxLines: 3,
                              labelText: 'Ends At',
                              textCapitalization: TextCapitalization.none,
                              validator: (String? text) {
                                if (text == null || text.isEmpty) {
                                  return 'Please select the break end time.';
                                } else {
                                  if (!RegExp(BasicRegEx.time).hasMatch(text)) {
                                    return 'Please enter a valid time (e.g. 02:00 PM).';
                                  } else {
                                    return null;
                                  }
                                }
                              },
                            ),
                          ),
                        ],
                      ),
                    ),
                    Align(
                      alignment: Alignment.bottomRight,
                      child: TextButton(
                        onPressed: _onAddBreakButtonPressed,
                        style: ButtonStyle(
                          overlayColor: WidgetStatePropertyAll(
                            context.appColors.neutralShade350.withAlpha(31),
                          ),
                        ),
                        child: Text(
                          'Add Break',
                          style: TextStyle(
                            color: context.appColors.greenShade100,
                            fontSize: context.scale(14),
                          ),
                        ),
                      ),
                    ),
                    if (_breakTimings.isNotEmpty) ...[
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        spacing: context.scale(12),
                        children: [
                          Text(
                            'Added Break Periods',
                            style: TextStyle(
                              fontSize: context.scale(14),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          Material(
                            borderRadius: BorderRadius.circular(context.scale(12)),
                            color: context.appColors.backgroundShade100,
                            child: ListView.separated(
                              itemBuilder: (BuildContext context, int index) {
                                final BreakTime breakTime = _breakTimings.elementAt(index);
                                return ListTile(
                                  contentPadding: EdgeInsets.all(context.scale(18)),
                                  horizontalTitleGap: context.scale(12),
                                  leading: SizedBox.square(
                                    dimension: context.scale(20),
                                    child: Center(
                                      child: Text(
                                        '${index + 1}.',
                                        style: TextStyle(
                                          color: context.appColors.neutralShade750,
                                          fontSize: context.scale(14),
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                  ),
                                  minTileHeight: 0,
                                  minLeadingWidth: 0,
                                  minVerticalPadding: 0,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(context.scale(8)),
                                  ),
                                  title: Text(
                                    '${breakTime.startsAt} - ${breakTime.endsAt}',
                                    style: TextStyle(
                                      color: context.appColors.neutralShade750,
                                      fontSize: context.scale(14),
                                    ),
                                  ),
                                  trailing: InkWell(
                                    onTap: () => _onBreakTimeDeleteIconTap(breakTime),
                                    overlayColor: WidgetStateColor.transparent,
                                    splashFactory: NoSplash.splashFactory,
                                    child: Icon(
                                      AppIcons.solidRoundedDelete02,
                                      color: context.appColors.redShade100.withAlpha(191),
                                      size: context.scale(20),
                                    ),
                                  ),
                                );
                              },
                              itemCount: _breakTimings.length,
                              padding: EdgeInsets.zero,
                              physics: const NeverScrollableScrollPhysics(),
                              separatorBuilder: (BuildContext context, int index) {
                                return Divider(
                                  color: context.appColors.backgroundShade200,
                                  endIndent: context.scale(16),
                                  indent: context.scale(48),
                                  height: 1.0,
                                );
                              },
                              shrinkWrap: true,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: CustomBottomAppBar(
        child: Row(
          spacing: context.scale(12),
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: _onBackButtonPressed,
                child: const Text('Back'),
              ),
            ),
            Expanded(
              child: FilledButton(
                onPressed: _onNextButtonPressed,
                child: const Text('Next'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
