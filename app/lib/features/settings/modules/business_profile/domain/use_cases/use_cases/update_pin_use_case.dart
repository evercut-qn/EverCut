// lib/features/settings/modules/business_profile/domain/use_cases/use_cases/update_pin_use_case.dart

import '../params/update_pin_params.dart';
import '../repositories/business_profile_repository.dart';

class UpdatePinUseCase {
  final BusinessProfileRepository repository;

  const UpdatePinUseCase(this.repository);

  Future<void> call(UpdatePinParams params) async {
    return await repository.updatePin(params);
  }
}
