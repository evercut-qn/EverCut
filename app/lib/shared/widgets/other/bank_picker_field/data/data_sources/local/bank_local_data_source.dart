// lib/shared/widgets/other/bank_picker_field/data/data_sources/local/bank_local_data_source.dart

import '../../models/bank_group_model.dart';
import '../../models/bank_model.dart';

abstract class BankLocalDataSource {
  List<BankGroupModel> getBanks();
  List<BankModel> searchBanks(String query);
}
