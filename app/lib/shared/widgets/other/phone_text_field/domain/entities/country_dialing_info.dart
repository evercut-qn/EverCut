// lib/shared/widgets/other/phone_text_field/domain/entities/country_dialing_info.dart

class CountryDialingInfo {
  final String dialCode;
  final String formatPattern;
  final String validationRegex;
  final List<int> digitGroups;

  const CountryDialingInfo({
    required this.dialCode,
    required this.formatPattern,
    required this.validationRegex,
    required this.digitGroups,
  });
}
