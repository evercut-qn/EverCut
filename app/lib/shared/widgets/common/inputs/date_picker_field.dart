// lib/shared/widgets/common/inputs/date_picker_field.dart

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/foundation/app_icons.dart';

import 'text_form_field.dart';

class DatePickerField extends StatefulWidget {
  final AutovalidateMode? autovalidateMode;
  final TextEditingController controller;
  final int errorMaxLines;
  final bool? filled;
  final FocusNode? focusNode;
  final String? fontFamily;
  final String? hintText;
  final DateTime? initialDate;
  final TextInputType? keyboardType;
  final String? labelText;
  final DateTime? lastDate;
  final TextCapitalization textCapitalization;
  final TextAlign textAlign;
  final String? Function(String?)? validator;

  const DatePickerField({
    super.key,
    this.autovalidateMode,
    required this.controller,
    this.errorMaxLines = 1,
    this.filled,
    this.focusNode,
    this.fontFamily,
    this.hintText,
    this.initialDate,
    this.keyboardType,
    this.labelText,
    this.lastDate,
    this.textCapitalization = TextCapitalization.none,
    this.textAlign = TextAlign.start,
    this.validator,
  });

  @override
  State<DatePickerField> createState() => _DatePickerFieldState();
}

class _DatePickerFieldState extends State<DatePickerField> {
  @override
  void initState() {
    super.initState();

    if (widget.initialDate != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          widget.controller.text = DateFormat('dd MMMM yyyy').format(widget.initialDate!);
        }
      });
    }
  }

  DateTime? _parseDate() {
    try {
      return DateFormat('dd MMMM yyyy').parse(widget.controller.text);
    } catch (error) {
      return null;
    }
  }

  Future<void> _pickDate() async {
    await showDatePicker(
      context: context,
      firstDate: DateTime(1901),
      initialDate: _parseDate() ?? (widget.lastDate ?? DateTime.now()),
      lastDate: widget.lastDate ?? DateTime.now(),
      helpText: 'Select Date of Birth',
    ).then((DateTime? pickedDate) {
      if (mounted && pickedDate != null) {
        widget.controller.text = DateFormat('dd MMMM yyyy').format(pickedDate);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return CustomTextFormField(
      autovalidateMode: widget.autovalidateMode ?? AutovalidateMode.onUserInteraction,
      controller: widget.controller,
      errorMaxLines: widget.errorMaxLines,
      filled: widget.filled,
      focusNode: widget.focusNode,
      fontFamily: widget.fontFamily,
      hintText: widget.hintText,
      keyboardType: widget.keyboardType,
      labelText: widget.labelText,
      onTap: _pickDate,
      prefixIcon: AppIcons.solidRoundedCalendar02,
      readOnly: true,
      suffixIcon: Icons.chevron_right,
      textCapitalization: widget.textCapitalization,
      textAlign: widget.textAlign,
      validator: widget.validator,
    );
  }
}
