// lib/shared/widgets/common/inputs/time_picker_field.dart

import 'package:flutter/material.dart';

import '../../../../core/constants/regex/basic_regex.dart';
import '../../../../core/theme/foundation/app_icons.dart';

import 'text_form_field.dart';

class TimePickerField extends StatefulWidget {
  final AutovalidateMode? autovalidateMode;
  final TextEditingController controller;
  final int errorMaxLines;
  final bool? filled;
  final FocusNode? focusNode;
  final String? fontFamily;
  final String? hintText;
  final TimeOfDay? initialTime;
  final String? labelText;
  final TextCapitalization textCapitalization;
  final TextAlign textAlign;
  final String? Function(String?)? validator;

  const TimePickerField({
    super.key,
    this.autovalidateMode,
    required this.controller,
    this.errorMaxLines = 1,
    this.filled,
    this.focusNode,
    this.fontFamily,
    this.hintText,
    this.initialTime,
    this.labelText,
    this.textCapitalization = TextCapitalization.none,
    this.textAlign = TextAlign.start,
    this.validator,
  });

  @override
  State<TimePickerField> createState() => _TimePickerFieldState();
}

class _TimePickerFieldState extends State<TimePickerField> {
  @override
  void initState() {
    super.initState();

    if (widget.initialTime != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          widget.controller.text = widget.initialTime!.format(context);
        }
      });
    }
  }

  TimeOfDay? _parseTime() {
    final match = RegExp(
      BasicRegEx.time,
      caseSensitive: false,
    ).firstMatch(widget.controller.text.trim());

    if (match == null) {
      return null;
    }

    final hour = int.parse(match.group(1)!);
    final minute = int.parse(match.group(2)!);

    if (hour < 1 || hour > 12 || minute > 59) {
      return null;
    }

    final hour24 = (hour % 12) + (match.group(3)!.toUpperCase() == 'PM' ? 12 : 0);

    return TimeOfDay(
      hour: hour24,
      minute: minute,
    );
  }

  Future<void> _pickTime() async {
    await showTimePicker(
      context: context,
      initialTime: _parseTime() ?? TimeOfDay.now(),
    ).then((TimeOfDay? pickedTime) {
      if (mounted && pickedTime != null) {
        widget.controller.text = pickedTime.format(context);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return CustomTextFormField(
      autovalidateMode: widget.autovalidateMode ?? AutovalidateMode.onUserInteraction,
      canRequestFocus: false,
      controller: widget.controller,
      errorMaxLines: widget.errorMaxLines,
      filled: widget.filled,
      focusNode: widget.focusNode,
      fontFamily: widget.fontFamily,
      hintText: widget.hintText,
      labelText: widget.labelText,
      onTap: _pickTime,
      prefixIcon: AppIcons.solidRoundedClock03,
      readOnly: true,
      textCapitalization: widget.textCapitalization,
      textAlign: widget.textAlign,
      validator: widget.validator,
    );
  }
}
