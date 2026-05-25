// lib/shared/widgets/other/phone_text_field/data/models/country_dialing_info_model.dart

import '../../domain/entities/country_dialing_info.dart';

class CountryDialingInfoModel {
  final String dialCode;
  final String formatPattern;
  final String validationRegex;
  final List<int> digitGroups;

  const CountryDialingInfoModel({
    required this.dialCode,
    required this.formatPattern,
    required this.validationRegex,
    required this.digitGroups,
  });

  CountryDialingInfo toEntity() {
    return CountryDialingInfo(
      dialCode: dialCode,
      formatPattern: formatPattern,
      validationRegex: validationRegex,
      digitGroups: digitGroups,
    );
  }
}
