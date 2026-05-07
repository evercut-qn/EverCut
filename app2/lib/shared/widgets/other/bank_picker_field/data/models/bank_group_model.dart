// lib/shared/widgets/other/bank_picker_field/data/models/bank_group_model.dart

import '../../domain/entities/bank_group.dart';

import 'bank_model.dart';

class BankGroupModel {
  final String initial;
  final List<BankModel> banks;

  const BankGroupModel({
    required this.initial,
    required this.banks,
  });

  BankGroup toEntity() {
    return BankGroup(
      initial: initial,
      banks: banks.map((BankModel bank) {
        return bank.toEntity();
      }).toList(),
    );
  }
}
