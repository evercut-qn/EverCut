// lib/features/settings/modules/business_profile/domain/use_cases/use_cases/get_shop_profile_use_case.dart

import '../repositories/business_profile_repository.dart';

class GetShopProfileUseCase {
  final BusinessProfileRepository repository;

  const GetShopProfileUseCase(this.repository);

  Future<ShopProfileEntity> call() async {
    return await repository.getShopProfile();
  }
}
