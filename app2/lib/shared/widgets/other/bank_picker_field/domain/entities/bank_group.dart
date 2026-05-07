// lib/shared/widgets/other/bank_picker_field/domain/entities/bank_group.dart

import 'bank.dart';

class BankGroup {
  final String initial;
  final List<Bank> banks;

  const BankGroup({
    required this.initial,
    required this.banks,
  });
}
