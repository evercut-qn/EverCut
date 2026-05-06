// lib/shared/widgets/other/phone_text_field/domain/repositories/country_repository.dart

import '../entities/country.dart';
import '../entities/country_group.dart';

abstract class CountryRepository {
  List<CountryGroup> getAllCountries();
  Country? getCountryByDialCode(String dialCode);
  Country? getCountryByIsoCode(String isoCode);
  List<Country> searchCountries(String query);
}
