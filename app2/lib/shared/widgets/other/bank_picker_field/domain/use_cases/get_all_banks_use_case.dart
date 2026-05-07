// lib/shared/widgets/other/bank_picker_field/domain/use_cases/get_all_banks_use_case.dart

import '../entities/bank_group.dart';
import '../repositories/bank_repository.dart';

class GetAllBanksUseCase {
  final BankRepository repository;

  const GetAllBanksUseCase(this.repository);

  List<BankGroup> call() {
    return repository.getBanks();
  }
}
