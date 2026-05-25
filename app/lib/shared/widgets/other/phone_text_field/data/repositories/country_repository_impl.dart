// lib/shared/widgets/other/phone_text_field/data/repositories/country_repository_impl.dart

import '../../domain/entities/country.dart';
import '../../domain/entities/country_group.dart';
import '../../domain/repositories/country_repository.dart';
import '../data_sources/local/country_local_data_source.dart';

class CountryRepositoryImpl implements CountryRepository {
  final CountryLocalDataSource localDataSource;

  const CountryRepositoryImpl(this.localDataSource);

  @override
  List<CountryGroup> getAllCountries() {
    return localDataSource.getCountries().map((group) {
      return group.toEntity();
    }).toList();
  }

  @override
  Country? getCountryByIsoCode(String isoCode) {
    return localDataSource.getCountryByIsoCode(isoCode)?.toEntity();
  }

  @override
  Country? getCountryByDialCode(String dialCode) {
    return localDataSource.getCountryByDialCode(dialCode)?.toEntity();
  }

  @override
  List<Country> searchCountries(String query) {
    return localDataSource.searchCountries(query).map((country) {
      return country.toEntity();
    }).toList();
  }
}
