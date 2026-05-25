// lib/shared/widgets/other/bank_picker_field/domain/use_cases/search_banks_use_case.dart

import '../entities/bank.dart';
import '../repositories/bank_repository.dart';

class SearchBanksUseCase {
  final BankRepository repository;

  const SearchBanksUseCase(this.repository);

  List<Bank> call(String query) {
    return repository.searchBanks(query);
  }
}
