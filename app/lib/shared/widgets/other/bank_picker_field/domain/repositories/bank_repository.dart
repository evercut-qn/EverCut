// lib/shared/widgets/other/bank_picker_field/domain/repositories/bank_repository.dart

import '../entities/bank.dart';
import '../entities/bank_group.dart';

abstract class BankRepository {
  List<BankGroup> getBanks();
  List<Bank> searchBanks(String query);
}
