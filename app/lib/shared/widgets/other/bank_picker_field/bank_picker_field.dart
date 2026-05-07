// lib/shared/widgets/other/bank_picker_field/bank_picker_field.dart

import 'package:flutter/material.dart';
import 'package:flutter_svg/svg.dart';
import 'package:go_router/go_router.dart';
import 'package:shimmer/shimmer.dart';

import '../../../../core/navigation/transitions/transitions.dart';
import '../../../../core/theme/foundation/app_icons.dart';
import '../../../../core/theme/presentation/widgets/theme_mode_builder.dart';
import '../../../extensions/context/app_colors_extension.dart';
import '../../../extensions/context/device_metrics_extension.dart';
import '../../common/appbars/search_bar.dart';
import '../../common/inputs/text_form_field.dart';
import '../../overlays/dialogs.dart';
import '../loaders/shimmer_container.dart';

import 'data/data_sources/local/bank_local_data_source.dart';
import 'data/data_sources/local/bank_local_data_source_impl.dart';
import 'data/repositories/bank_repository_impl.dart';
import 'domain/entities/bank.dart';
import 'domain/entities/bank_group.dart';
import 'domain/repositories/bank_repository.dart';
import 'domain/use_cases/get_all_banks_use_case.dart';
import 'domain/use_cases/search_banks_use_case.dart';

part 'presentation/widgets/bank_selection_dialog.dart';

class BankPickerField extends StatelessWidget {
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
  Widget build(BuildContext context) {
    return CustomTextFormField(
      autovalidateMode: autovalidateMode ?? AutovalidateMode.onUserInteraction,
      controller: controller,
      errorMaxLines: errorMaxLines,
      filled: filled,
      focusNode: focusNode,
      fontFamily: fontFamily,
      hintText: hintText,
      labelText: labelText,
      onTap: () async {
        final String? bank = await Dialogs.of(context).showFullscreenDialog<String?>(
          barrierDismissible: false,
          barrierLabel: 'Close Bank Selection Dialog',
          child: const BankSelectionDialog(),
          transition: Transitions.rightToLeftFade,
          transitionDuration: const Duration(milliseconds: 150),
        );

        if (bank != null && bank.isNotEmpty) {
          controller.text = bank;
        }
      },
      prefixIcon: AppIcons.solidRoundedBank,
      readOnly: true,
      textCapitalization: textCapitalization,
      textAlign: textAlign,
      suffixIcon: Icons.chevron_right,
      validator: validator,
    );
  }
}
