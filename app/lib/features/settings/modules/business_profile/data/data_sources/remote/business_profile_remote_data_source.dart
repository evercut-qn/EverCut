// lib/features/settings/modules/business_profile/data/data_sources/remote/business_profile_remote_data_source.dart

import '../../models/request/update_business_profile_request_model.dart';
import '../../models/request/update_payout_details_request_model.dart';
import '../../models/request/update_pin_request_model.dart';
import '../../models/response/shop_profile_response_model.dart';

abstract interface class BusinessProfileRemoteDataSource {
  Future<ShopProfileResponseModel> getShopProfile();
  Future<ShopProfileResponseModel> updateBusinessProfile(UpdateBusinessProfileRequestModel params);
  Future<ShopProfileResponseModel> getPayoutDetails();
  Future<ShopProfileResponseModel> updatePayoutDetails(UpdatePayoutDetailsRequestModel params);
  Future<ShopProfileResponseModel> updateProfilePicture(String filePath);
  Future<ShopProfileResponseModel> updateCoverImage(String filePath);
  Future<void> updatePin(UpdatePinRequestModel params);
}
