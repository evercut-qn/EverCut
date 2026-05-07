// lib/shared/widgets/other/phone_text_field/domain/entities/country.dart

import '../../../../common/icons/flag_icon.dart';

import 'country_dialing_info.dart';

class Country {
  final String isoCode;
  final String name;
  final FlagIconData flag;
  final CountryDialingInfo dialingInfo;

  const Country({
    required this.isoCode,
    required this.name,
    required this.flag,
    required this.dialingInfo,
  });
}
