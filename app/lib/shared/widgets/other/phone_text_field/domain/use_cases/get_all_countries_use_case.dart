// lib/shared/widgets/other/phone_text_field/domain/use_cases/get_all_countries_use_case.dart

import '../repositories/country_repository.dart';
import '../entities/country_group.dart';

class GetAllCountriesUseCase {
  final CountryRepository repository;

  const GetAllCountriesUseCase(this.repository);

  List<CountryGroup> call() {
    return repository.getAllCountries();
  }
}
