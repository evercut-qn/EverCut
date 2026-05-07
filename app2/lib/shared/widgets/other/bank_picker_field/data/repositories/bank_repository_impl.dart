// lib/shared/widgets/other/bank_picker_field/data/repositories/bank_repository_impl.dart

import '../../domain/entities/bank.dart';
import '../../domain/entities/bank_group.dart';
import '../../domain/repositories/bank_repository.dart';
import '../data_sources/local/bank_local_data_source.dart';

class BankRepositoryImpl implements BankRepository {
  final BankLocalDataSource localDataSource;

  const BankRepositoryImpl(this.localDataSource);

  @override
  List<BankGroup> getBanks() {
    return localDataSource.getBanks().map((group) {
      return group.toEntity();
    }).toList();
  }

  @override
  List<Bank> searchBanks(String query) {
    return localDataSource.searchBanks(query).map((bank) {
      return bank.toEntity();
    }).toList();
  }
}
