// lib/shared/widgets/other/phone_text_field/data/models/country_group_model.dart

import '../../domain/entities/country_group.dart';

import 'country_model.dart';

class CountryGroupModel {
  final String initial;
  final List<CountryModel> countries;

  const CountryGroupModel({
    required this.initial,
    required this.countries,
  });

  CountryGroup toEntity() {
    return CountryGroup(
      initial: initial,
      countries: countries.map((country) {
        return country.toEntity();
      }).toList(),
    );
  }
}
