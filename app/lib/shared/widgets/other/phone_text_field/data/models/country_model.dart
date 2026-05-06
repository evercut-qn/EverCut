// lib/shared/widgets/other/phone_text_field/data/models/country_model.dart

import '../../../../common/icons/flag_icon.dart';
import '../../domain/entities/country.dart';

import 'country_dialing_info_model.dart';

class CountryModel {
  final String isoCode;
  final String name;
  final FlagIconData flag;
  final CountryDialingInfoModel dialingInfo;

  const CountryModel({
    required this.isoCode,
    required this.name,
    required this.flag,
    required this.dialingInfo,
  });

  Country toEntity() {
    return Country(
      isoCode: isoCode,
      name: name,
      flag: flag,
      dialingInfo: dialingInfo.toEntity(),
    );
  }
}
