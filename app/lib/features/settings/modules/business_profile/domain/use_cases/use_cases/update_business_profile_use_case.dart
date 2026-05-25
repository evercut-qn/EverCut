// lib/features/settings/modules/business_profile/domain/use_cases/use_cases/update_business_profile_use_case.dart

import '../params/update_business_profile_params.dart';
import '../repositories/business_profile_repository.dart';

class UpdateBusinessProfileUseCase {
  final BusinessProfileRepository repository;

  const UpdateBusinessProfileUseCase(this.repository);

  Future<ShopProfileEntity> call(UpdateBusinessProfileParams params) async {
    return await repository.updateBusinessProfile(params);
  }
}
