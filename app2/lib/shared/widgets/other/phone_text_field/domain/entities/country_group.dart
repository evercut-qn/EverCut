// lib/shared/widgets/other/phone_text_field/domain/entities/country_group.dart

import 'country.dart';

class CountryGroup {
  final String initial;
  final List<Country> countries;

  const CountryGroup({
    required this.initial,
    required this.countries,
  });
}
