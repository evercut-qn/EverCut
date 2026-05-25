// lib/features/settings/modules/business_profile/presentation/views/manage_availability/manage_availability_screen.dart

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../../../../core/theme/foundation/app_icons.dart';
import '../../../../../../../shared/enums/weekday.dart';
import '../../../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../../../../shared/widgets/common/appbars/bottom_appbar.dart';
import '../../../../../../../shared/widgets/common/inputs/time_picker_field.dart';
import '../../../../../../../shared/widgets/common/section/section_header.dart';
import '../../../../../../../shared/widgets/other/weekday_selector.dart';
import '../../../../../../../shared/widgets/overlays/snackbars.dart';
import '../../../../../../../shared/models/scheduling/break_time.dart';
import '../../../bloc/business_profile_bloc.dart';
import '../../../domain/use_cases/params/update_business_profile_params.dart';

class ManageAvailabilityScreen extends StatefulWidget {
  const ManageAvailabilityScreen({super.key});

  @override
  State<ManageAvailabilityScreen> createState() => _ManageAvailabilityScreenState();
}

class _ManageAvailabilityScreenState extends State<ManageAvailabilityScreen> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final TextEditingController _openTimeController = TextEditingController();
  final TextEditingController _closeTimeController = TextEditingController();
  final TextEditingController _breakStartTimeController = TextEditingController();
  final TextEditingController _breakEndTimeController = TextEditingController();
  final GlobalKey<FormState> _breakFieldsFormKey = GlobalKey<FormState>();

  final List<WeekdayEnum> _selectedWeekdays = [];
  final List<BreakTimeModel> _breakTimings = [];

  void _onAddBreakButtonPressed() {
    if (!_breakFieldsFormKey.currentState!.validate()) {
      return;
    }

    _breakTimings.add(BreakTimeModel(
      startsAt: _breakStartTimeController.text.trim(),
      endsAt: _breakEndTimeController.text.trim(),
    ));

    _breakStartTimeController.clear();
    _breakEndTimeController.clear();
    setState(() {});
  }

  void _onBreakTimeDeleteIconTap(BreakTimeModel breakTime) {
    _breakTimings.remove(breakTime);
    setState(() {});
  }

  void _onApplyChangesButtonPressed() {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    if (_selectedWeekdays.isEmpty) {
      SnackBars.of(context).showErrorSnackBar(
        title: 'Error',
        message: 'Please select at least one working day.',
      );
      return;
    }

    final workingDays = _selectedWeekdays.map((day) => day.label).toList();
    final breakTimes = _breakTimings.map((breakTime) => UpdateBusinessProfileParams.BreakTimeParams(
      start: breakTime.startsAt,
      end: breakTime.endsAt,
    )).toList();

    final params = UpdateBusinessProfileParams(
      workingDays: workingDays,
      openTime: _openTimeController.text.trim(),
      closeTime: _closeTimeController.text.trim(),
      breakTimes: breakTimes.isNotEmpty ? breakTimes : null,
    );

    context.read<BusinessProfileBloc>().add(BusinessProfileUpdateRequested(params));
  }

  @override
  void dispose() {
    _openTimeController.dispose();
    _closeTimeController.dispose();
    _breakStartTimeController.dispose();
    _breakEndTimeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<BusinessProfileBloc, BusinessProfileState>(
      listener: (context, state) {
        if (state is BusinessProfileLoaded) {
          SnackBars.of(context).showSuccessSnackBar(
            title: 'Success',
            message: 'Availability updated successfully',
          );
          Navigator.of(context).pop();
        } else if (state is BusinessProfileFailure) {
          SnackBars.of(context).showErrorSnackBar(
            title: 'Error',
            message: state.message,
          );
        }
      },
      builder: (context, state) {
        final isLoading = state is BusinessProfileUpdating;

        return Scaffold(
          appBar: AppBar(title: const Text('Manage Availability')),
          body: SafeArea(
            child: SingleChildScrollView(
              padding: EdgeInsets.all(context.scale(24)),
              child: Column(
                spacing: context.scale(18),
                children: [
                  const SectionHeader(
                    title: 'Manage Availability',
                    description: 'Set your working days, shop hours, and break timings to manage your schedule efficiently.',
                  ),
                  Form(
                    autovalidateMode: AutovalidateMode.onUnfocus,
                    key: _formKey,
                    child: Column(
                      spacing: context.scale(16),
                      children: [
                        WeekdaySelector(
                          selectedWeekdays: _selectedWeekdays,
                          onSelectionChanged: (List<WeekdayEnum> selectedWeekdays) {
                            _selectedWeekdays.clear();
                            _selectedWeekdays.addAll(selectedWeekdays);
                          },
                        ),
                        TimePickerField(
                          controller: _openTimeController,
                          labelText: 'Shop Opening Time',
                          leadingIcon: AppIcons.solidRoundedClock01,
                          validator: (String? text) {
                            if (text == null || text.isEmpty) {
                              return 'Please select shop opening time.';
                            } else {
                              return null;
                            }
                          },
                        ),
                        TimePickerField(
                          controller: _closeTimeController,
                          labelText: 'Shop Closing Time',
                          leadingIcon: AppIcons.solidRoundedClock01,
                          validator: (String? text) {
                            if (text == null || text.isEmpty) {
                              return 'Please select shop closing time.';
                            } else {
                              return null;
                            }
                          },
                        ),
                      ],
                    ),
                  ),
                  Divider(
                    color: context.appColors.backgroundShade200,
                    height: 1.0,
                  ),
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
                          key: _breakFieldsFormKey,
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            spacing: context.scale(16),
                            children: [
                              Expanded(
                                child: TimePickerField(
                                  autovalidateMode: AutovalidateMode.disabled,
                                  controller: _breakStartTimeController,
                                  errorMaxLines: 3,
                                  labelText: 'Starts At',
                                  textCapitalization: TextCapitalization.none,
                                  validator: (String? text) {
                                    if (text == null || text.isEmpty) {
                                      return 'Please select the break start time.';
                                    } else {
                                      return null;
                                    }
                                  },
                                ),
                              ),
                              Expanded(
                                child: TimePickerField(
                                  autovalidateMode: AutovalidateMode.disabled,
                                  controller: _breakEndTimeController,
                                  errorMaxLines: 3,
                                  labelText: 'Ends At',
                                  textCapitalization: TextCapitalization.none,
                                  validator: (String? text) {
                                    if (text == null || text.isEmpty) {
                                      return 'Please select the break end time.';
                                    } else {
                                      return null;
                                    }
                                  },
                                ),
                              ),
                            ],
                          ),
                        ),
                        Align(
                          alignment: AlignmentGeometry.bottomRight,
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
                                color: context.appColors.backgroundShade75,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(context.scale(12)),
                                  side: BorderSide(color: context.appColors.backgroundShade200),
                                ),
                                child: ListView.separated(
                                  itemBuilder: (BuildContext context, int index) {
                                    final BreakTimeModel breakTime = _breakTimings.elementAt(index);
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
                                      title: Text(
                                        '${breakTime.startsAt} - ${breakTime.endsAt}',
                                        style: TextStyle(
                                          color: context.appColors.neutralShade750,
                                          fontSize: context.scale(14),
                                        ),
                                      ),
                                      trailing: GestureDetector(
                                        onTap: () => _onBreakTimeDeleteIconTap(breakTime),
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
              children: [
                Expanded(
                  child: FilledButton(
                    onPressed: isLoading ? null : _onApplyChangesButtonPressed,
                    child: isLoading ? const SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Apply Changes'),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
