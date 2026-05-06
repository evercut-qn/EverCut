// lib/shared/widgets/other/phone_text_field/data/data_sources/local/country_local_data_source.dart

import '../../models/country_group_model.dart';
import '../../models/country_model.dart';

abstract class CountryLocalDataSource {
  List<CountryGroupModel> getCountries();
  CountryModel? getCountryByDialCode(String dialCode);
  CountryModel? getCountryByIsoCode(String isoCode);
  List<CountryModel> searchCountries(String query);
}
