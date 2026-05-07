// lib/shared/widgets/other/phone_text_field/phone_text_field.dart

import 'package:flutter/material.dart';
import 'package:flutter_svg/svg.dart';
import 'package:go_router/go_router.dart';
import 'package:shimmer/shimmer.dart';

import '../../../../core/navigation/transitions/transitions.dart';
import '../../../../core/theme/foundation/app_icons.dart';
import '../../../../core/theme/foundation/colors/dark_color_tokens.dart';
import '../../../../core/theme/foundation/colors/light_color_tokens.dart';
import '../../../../core/theme/presentation/widgets/theme_mode_builder.dart';
import '../../../extensions/context/app_colors_extension.dart';
import '../../../extensions/context/device_metrics_extension.dart';
import '../../../utils/formatters/phone_number.dart';
import '../../common/appbars/search_bar.dart';
import '../../common/icons/flag_icon.dart';
import '../../overlays/dialogs.dart';

import '../loaders/shimmer_container.dart';
import 'data/data_sources/local/country_local_data_source.dart';
import 'data/data_sources/local/country_local_data_source_impl.dart';
import 'data/repositories/country_repository_impl.dart';
import 'domain/entities/country.dart';
import 'domain/entities/country_dialing_info.dart';
import 'domain/entities/country_group.dart';
import 'domain/repositories/country_repository.dart';
import 'domain/use_cases/format_phone_number_use_case.dart';
import 'domain/use_cases/get_all_countries_use_case.dart';
import 'domain/use_cases/get_country_by_dial_code_use_case.dart';
import 'domain/use_cases/get_country_by_iso_code_use_case.dart';
import 'domain/use_cases/search_countries_use_case.dart';

part 'presentation/controller/phone_text_field_controller.dart';
part 'presentation/widgets/country_selection_dialog.dart';

class PhoneTextField extends StatelessWidget {
  final AutovalidateMode? autovalidateMode;
  final PhoneTextFieldController controller;
  final bool showCountrySelection;

  const PhoneTextField({
    super.key,
    this.autovalidateMode,
    required this.controller,
    this.showCountrySelection = true,
  });

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<Country>(
      valueListenable: controller.countryNotifier,
      builder: (BuildContext context, Country country, Widget? child) {
        return Column(
          spacing: context.scale(12),
          children: [
            if (showCountrySelection) ...[
              TextFormField(
                controller: TextEditingController(text: country.name),
                decoration: InputDecoration(
                  labelText: 'Country',
                  prefixIcon: Padding(
                    padding: EdgeInsets.only(left: context.scale(6)),
                    child: FlagIcon(
                      country.flag,
                      size: context.scale(16),
                    ),
                  ),
                  suffixIcon: Padding(
                    padding: EdgeInsets.only(right: context.scale(6)),
                    child: Icon(
                      AppIcons.strokeStandardArrowRight01,
                      size: context.scale(20),
                    ),
                  ),
                ),
                onTap: () async => controller.setCountry(
                  await Dialogs.of(context).showFullscreenDialog<Country?>(
                    barrierDismissible: false,
                    barrierLabel: 'Close Country Selection Dialog',
                    child: CountrySelectionDialog(controller),
                    transition: Transitions.rightToLeftFade,
                    transitionDuration: const Duration(milliseconds: 150),
                  ),
                ),
                readOnly: true,
                style: TextStyle(
                  color: context.appColors.neutralShade850,
                  fontSize: context.scale(14),
                ),
              ),
            ],
            TextFormField(
              autovalidateMode: autovalidateMode,
              controller: controller.textEditingController,
              decoration: InputDecoration(
                contentPadding: EdgeInsets.all(context.scale(16)),
                hintText: country.dialingInfo.formatPattern,
                labelText: 'Phone Number',
                errorMaxLines: 3,
                prefixIcon: IntrinsicHeight(
                  child: Padding(
                    padding: EdgeInsets.all(context.scale(16)).copyWith(
                      right: context.scale(12),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      spacing: context.scale(16),
                      children: [
                        Text(
                          country.dialingInfo.dialCode,
                          style: TextStyle(
                            color: context.appColors.neutralShade850,
                            fontSize: context.scale(14),
                          ),
                        ),
                        ThemeModeBuilder(
                          builder: (BuildContext context, bool isDarkMode) {
                            return VerticalDivider(
                              color: isDarkMode ? DarkColorTokens.neutralShade750.withAlpha(127) : LightColorTokens.neutralShade300,
                              width: 1.0,
                            );
                          },
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              inputFormatters: [PhoneNumberFormatter(country.dialingInfo.digitGroups)],
              keyboardType: TextInputType.number,
              style: TextStyle(
                color: context.appColors.neutralShade850,
                fontSize: context.scale(14),
              ),
              validator: (String? value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Please enter your phone number.';
                } else if (!RegExp(country.dialingInfo.validationRegex).hasMatch(value)) {
                  final dialingInfo = controller.countryNotifier.value.dialingInfo;
                  return 'Please enter a valid phone number (e.g. ${dialingInfo.dialCode} ${dialingInfo.formatPattern}).';
                } else {
                  return null;
                }
              },
            ),
          ],
        );
      },
    );
  }
}
