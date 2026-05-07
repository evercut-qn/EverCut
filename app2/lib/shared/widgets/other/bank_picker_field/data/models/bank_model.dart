// lib/shared/widgets/other/bank_picker_field/data/models/bank_model.dart

import '../../domain/entities/bank.dart';

class BankModel {
  final String name;

  const BankModel({
    required this.name,
  });

  Bank toEntity() {
    return Bank(
      name: name,
    );
  }
}
