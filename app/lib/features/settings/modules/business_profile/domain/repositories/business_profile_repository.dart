// lib/features/settings/modules/business_profile/domain/repositories/business_profile_repository.dart

import '../entities/shop_profile_entity.dart';
import '../use_cases/params/update_business_profile_params.dart';
import '../use_cases/params/update_payout_details_params.dart';
import '../use_cases/params/update_pin_params.dart';

abstract interface class BusinessProfileRepository {
  Future<ShopProfileEntity> getShopProfile();
  Future<ShopProfileEntity> updateBusinessProfile(UpdateBusinessProfileParams params);
  Future<ShopProfileEntity> getPayoutDetails();
  Future<ShopProfileEntity> updatePayoutDetails(UpdatePayoutDetailsParams params);
  Future<ShopProfileEntity> updateProfilePicture(String filePath);
  Future<ShopProfileEntity> updateCoverImage(String filePath);
  Future<void> updatePin(UpdatePinParams params);
}
