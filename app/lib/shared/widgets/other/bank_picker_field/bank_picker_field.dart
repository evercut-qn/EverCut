// lib/shared/widgets/other/bank_picker_field/bank_picker_field.dart

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/navigation/transitions/transitions.dart';
import '../../../../core/theme/foundation/app_icons.dart';
import '../../common/inputs/text_form_field.dart';
import '../../overlays/dialogs.dart';

import 'presentation/widgets/bank_selection_dialog.dart';

class BankPickerField extends StatefulWidget {
  final AutovalidateMode? autovalidateMode;
  final TextEditingController controller;
  final int errorMaxLines;
  final bool? filled;
  final FocusNode? focusNode;
  final String? fontFamily;
  final String? hintText;
  final String? labelText;
  final TextCapitalization textCapitalization;
  final TextAlign textAlign;
  final String? Function(String?)? validator;

  const BankPickerField({
    super.key,
    this.autovalidateMode,
    required this.controller,
    this.errorMaxLines = 1,
    this.filled,
    this.focusNode,
    this.fontFamily,
    this.hintText,
    this.labelText,
    this.textCapitalization = TextCapitalization.none,
    this.textAlign = TextAlign.start,
    this.validator,
  });

  @override
  State<BankPickerField> createState() => _BankPickerFieldState();
}

class _BankPickerFieldState extends State<BankPickerField> {
  @override
  Widget build(BuildContext context) {
    return CustomTextFormField(
      autovalidateMode: widget.autovalidateMode,
      controller: widget.controller,
      errorMaxLines: widget.errorMaxLines,
      filled: widget.filled,
      focusNode: widget.focusNode,
      fontFamily: widget.fontFamily,
      hintText: widget.hintText,
      labelText: widget.labelText,
      onTap: () async {
        final bank = await Dialogs.of(context).showFullscreenDialog<String?>(
          barrierDismissible: false,
          barrierLabel: 'Close Bank Selection Dialog',
          routeSettings: RouteSettings(name: '${GoRouterState.of(context).matchedLocation}/bank_selection_dialog'),
          child: const BankSelectionDialog(),
          transition: Transitions.rightToLeftFade,
          transitionDuration: const Duration(milliseconds: 150),
        );

        if (bank != null) {
          widget.controller.text = bank;
        }
      },
      prefixIcon: AppIcons.solidRoundedBank,
      readOnly: true,
      textCapitalization: widget.textCapitalization,
      textAlign: widget.textAlign,
      suffixIcon: Icons.chevron_right,
      validator: widget.validator,
    );
  }
}
