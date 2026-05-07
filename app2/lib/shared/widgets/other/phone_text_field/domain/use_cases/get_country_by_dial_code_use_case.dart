// lib/shared/widgets/other/phone_text_field/domain/use_cases/get_country_by_dial_code_use_case.dart

import '../repositories/country_repository.dart';
import '../entities/country.dart';

class GetCountryByDialCodeUseCase {
  final CountryRepository repository;

  const GetCountryByDialCodeUseCase(this.repository);

  Country? call(String dialCode) {
    return repository.getCountryByDialCode(dialCode);
  }
}
