// lib/features/settings/modules/business_profile/domain/use_cases/use_cases/update_payout_details_use_case.dart

import '../params/update_payout_details_params.dart';
import '../repositories/business_profile_repository.dart';

class UpdatePayoutDetailsUseCase {
  final BusinessProfileRepository repository;

  const UpdatePayoutDetailsUseCase(this.repository);

  Future<ShopProfileEntity> call(UpdatePayoutDetailsParams params) async {
    return await repository.updatePayoutDetails(params);
  }
}
