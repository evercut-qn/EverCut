// lib/shared/widgets/other/phone_text_field/domain/use_cases/get_country_by_iso_code_use_case.dart

import '../repositories/country_repository.dart';
import '../entities/country.dart';

class GetCountryByIsoCodeUseCase {
  final CountryRepository repository;

  const GetCountryByIsoCodeUseCase(this.repository);

  Country? call(String isoCode) {
    return repository.getCountryByIsoCode(isoCode);
  }
}
