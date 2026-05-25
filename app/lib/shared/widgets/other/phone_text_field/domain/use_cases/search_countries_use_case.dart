// lib/shared/widgets/other/phone_text_field/domain/use_cases/search_countries_use_case.dart

import '../repositories/country_repository.dart';
import '../entities/country.dart';

class SearchCountriesUseCase {
  final CountryRepository repository;

  const SearchCountriesUseCase(this.repository);

  List<Country> call(String query) {
    return repository.searchCountries(query);
  }
}
