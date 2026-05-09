// lib/features/settings/modules/business_profile/data/repositories/business_profile_repository_impl.dart

import '../../../../../../core/errors/api/api_exception.dart';
import '../../../domain/entities/shop_profile_entity.dart';
import '../../../domain/repositories/business_profile_repository.dart';
import '../../../domain/use_cases/params/update_business_profile_params.dart';
import '../../../domain/use_cases/params/update_payout_details_params.dart';
import '../../../domain/use_cases/params/update_pin_params.dart';
import '../../data_sources/remote/business_profile_remote_data_source.dart';
import '../../models/request/update_business_profile_request_model.dart';
import '../../models/request/update_payout_details_request_model.dart';
import '../../models/request/update_pin_request_model.dart';
import '../../models/response/shop_profile_response_model.dart';

class BusinessProfileRepositoryImpl implements BusinessProfileRepository {
  final BusinessProfileRemoteDataSource remoteDataSource;

  const BusinessProfileRepositoryImpl(this.remoteDataSource);

  @override
  Future<ShopProfileEntity> getShopProfile() async {
    try {
      final response = await remoteDataSource.getShopProfile();
      return _mapToEntity(response);
    } catch (_) {
      rethrow;
    }
  }

  @override
  Future<ShopProfileEntity> updateBusinessProfile(UpdateBusinessProfileParams params) async {
    try {
      final requestModel = UpdateBusinessProfileRequestModel(
        shopName: params.shopName,
        firstName: params.firstName,
        lastName: params.lastName,
        gender: params.gender,
        dateOfBirth: params.dateOfBirth,
        numberOfEmployees: params.numberOfEmployees,
        yearsOfExperience: params.yearsOfExperience,
        bio: params.bio,
        address: params.address,
        category: params.category,
        targetCustomers: params.targetCustomers,
        amenities: params.amenities,
        workingDays: params.workingDays,
        openTime: params.openTime,
        closeTime: params.closeTime,
        breakTimes: params.breakTimes?.map((e) => BreakTimeRequestModel(start: e.start, end: e.end)).toList(),
        isOpen: params.isOpen,
        location: params.location != null
            ? LocationRequestModel(
                type: params.location!.type ?? 'Point',
                coordinates: params.location!.coordinates ?? [],
              )
            : null,
      );
      final response = await remoteDataSource.updateBusinessProfile(requestModel);
      return _mapToEntity(response);
    } catch (_) {
      rethrow;
    }
  }

  @override
  Future<ShopProfileEntity> getPayoutDetails() async {
    try {
      final response = await remoteDataSource.getPayoutDetails();
      return _mapToEntity(response);
    } catch (_) {
      rethrow;
    }
  }

  @override
  Future<ShopProfileEntity> updatePayoutDetails(UpdatePayoutDetailsParams params) async {
    try {
      final requestModel = UpdatePayoutDetailsRequestModel(
        accountHolderName: params.accountHolderName,
        bankName: params.bankName,
        bankAccount: params.bankAccount,
        ifsc: params.ifsc,
        upiId: params.upiId,
      );
      final response = await remoteDataSource.updatePayoutDetails(requestModel);
      return _mapToEntity(response);
    } catch (_) {
      rethrow;
    }
  }

  @override
  Future<ShopProfileEntity> updateProfilePicture(String filePath) async {
    try {
      final response = await remoteDataSource.updateProfilePicture(filePath);
      return _mapToEntity(response);
    } catch (_) {
      rethrow;
    }
  }

  @override
  Future<ShopProfileEntity> updateCoverImage(String filePath) async {
    try {
      final response = await remoteDataSource.updateCoverImage(filePath);
      return _mapToEntity(response);
    } catch (_) {
      rethrow;
    }
  }

  @override
  Future<void> updatePin(UpdatePinParams params) async {
    try {
      final requestModel = UpdatePinRequestModel(
        currentPin: params.currentPin,
        newPin: params.newPin,
        confirmNewPin: params.confirmNewPin,
      );
      await remoteDataSource.updatePin(requestModel);
    } catch (_) {
      rethrow;
    }
  }

  ShopProfileEntity _mapToEntity(ShopProfileResponseModel model) {
    return ShopProfileEntity(
      id: model.id,
      owner: model.owner != null
          ? OwnerEntity(
              id: model.owner!.id,
              firstName: model.owner!.firstName,
              lastName: model.owner!.lastName,
              gender: model.owner!.gender,
              dateOfBirth: model.owner!.dateOfBirth,
              email: model.owner!.email,
              phoneNumber: model.owner!.phoneNumber,
              photoUrl: model.owner!.photoUrl,
            )
          : null,
      shopName: model.shopName,
      category: model.category,
      targetCustomers: model.targetCustomers,
      payout: model.payout != null
          ? PayoutEntity(
              accountHolderName: model.payout!.accountHolderName,
              bankName: model.payout!.bankName,
              upiId: model.payout!.upiId,
              bankAccountLast4: model.payout!.bankAccountLast4,
              ifsc: model.payout!.ifsc,
              verificationStatus: model.payout!.verificationStatus,
              isVerified: model.payout!.isVerified,
              verifiedAt: model.payout!.verifiedAt,
              beneficiaryId: model.payout!.beneficiaryId,
              beneficiaryCreatedAt: model.payout!.beneficiaryCreatedAt,
              canReceivePayouts: model.payout!.canReceivePayouts,
            )
          : null,
      bio: model.bio,
      address: model.address,
      location: model.location != null
          ? LocationEntity(
              type: model.location!.type,
              coordinates: model.location!.coordinates,
            )
          : null,
      numberOfEmployees: model.numberOfEmployees,
      yearsOfExperience: model.yearsOfExperience,
      amenities: model.amenities,
      workingDays: model.workingDays,
      workingHours: model.workingHours != null
          ? WorkingHoursEntity(
              openTime: model.workingHours!.openTime,
              closeTime: model.workingHours!.closeTime,
            )
          : null,
      breakTimes: model.breakTimes?.map((e) => BreakTimeEntity(start: e.start, end: e.end)).toList(),
      coverUrl: model.coverUrl,
      isOpen: model.isOpen,
      missedConfirmations: model.missedConfirmations != null
          ? MissedConfirmationsEntity(
              count: model.missedConfirmations!.count,
              lastMissedAt: model.missedConfirmations!.lastMissedAt,
            )
          : null,
      photos: model.photos?.map((e) => PhotoEntity(
            id: e.id,
            type: e.type,
            url: e.url,
            createdAt: e.createdAt,
          )).toList(),
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    );
  }
}
