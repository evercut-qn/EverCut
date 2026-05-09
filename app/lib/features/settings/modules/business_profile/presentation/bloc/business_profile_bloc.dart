// lib/features/settings/modules/business_profile/presentation/bloc/business_profile_bloc.dart

import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../../../core/errors/app_exception.dart';
import '../../../domain/entities/shop_profile_entity.dart';
import '../../../domain/use_cases/params/update_business_profile_params.dart';
import '../../../domain/use_cases/params/update_payout_details_params.dart';
import '../../../domain/use_cases/params/update_pin_params.dart';
import '../../../domain/use_cases/use_cases/get_shop_profile_use_case.dart';
import '../../../domain/use_cases/use_cases/update_business_profile_use_case.dart';
import '../../../domain/use_cases/use_cases/update_cover_image_use_case.dart';
import '../../../domain/use_cases/use_cases/update_payout_details_use_case.dart';
import '../../../domain/use_cases/use_cases/update_pin_use_case.dart';
import '../../../domain/use_cases/use_cases/update_profile_picture_use_case.dart';

part 'business_profile_event.dart';
part 'business_profile_state.dart';

class BusinessProfileBloc extends Bloc<BusinessProfileEvent, BusinessProfileState> {
  final GetShopProfileUseCase getShopProfile;
  final UpdateBusinessProfileUseCase updateBusinessProfile;
  final UpdatePayoutDetailsUseCase updatePayoutDetails;
  final UpdateProfilePictureUseCase updateProfilePicture;
  final UpdateCoverImageUseCase updateCoverImage;
  final UpdatePinUseCase updatePin;

  BusinessProfileBloc(
    this.getShopProfile,
    this.updateBusinessProfile,
    this.updatePayoutDetails,
    this.updateProfilePicture,
    this.updateCoverImage,
    this.updatePin,
  ) : super(BusinessProfileInitial()) {
    on<BusinessProfileFetchRequested>(_onFetchRequested);
    on<BusinessProfileUpdateRequested>(_onUpdateRequested);
    on<BusinessProfilePayoutDetailsUpdateRequested>(_onPayoutDetailsUpdateRequested);
    on<BusinessProfileProfilePictureUpdateRequested>(_onProfilePictureUpdateRequested);
    on<BusinessProfileCoverImageUpdateRequested>(_onCoverImageUpdateRequested);
    on<BusinessProfilePinUpdateRequested>(_onPinUpdateRequested);
  }

  Future<void> _onFetchRequested(
    BusinessProfileFetchRequested event,
    Emitter<BusinessProfileState> emit,
  ) async {
    try {
      emit(BusinessProfileLoading());
      final profile = await getShopProfile();
      emit(BusinessProfileLoaded(profile));
    } on AppException catch (error, stackTrace) {
      emit(BusinessProfileFailure(error.message, stackTrace));
    } catch (error, stackTrace) {
      emit(BusinessProfileFailure(error.toString(), stackTrace));
    }
  }

  Future<void> _onUpdateRequested(
    BusinessProfileUpdateRequested event,
    Emitter<BusinessProfileState> emit,
  ) async {
    try {
      emit(BusinessProfileUpdating());
      final profile = await updateBusinessProfile(event.params);
      emit(BusinessProfileLoaded(profile));
    } on AppException catch (error, stackTrace) {
      emit(BusinessProfileFailure(error.message, stackTrace));
    } catch (error, stackTrace) {
      emit(BusinessProfileFailure(error.toString(), stackTrace));
    }
  }

  Future<void> _onPayoutDetailsUpdateRequested(
    BusinessProfilePayoutDetailsUpdateRequested event,
    Emitter<BusinessProfileState> emit,
  ) async {
    try {
      emit(BusinessProfileUpdating());
      final profile = await updatePayoutDetails(event.params);
      emit(BusinessProfileLoaded(profile));
    } on AppException catch (error, stackTrace) {
      emit(BusinessProfileFailure(error.message, stackTrace));
    } catch (error, stackTrace) {
      emit(BusinessProfileFailure(error.toString(), stackTrace));
    }
  }

  Future<void> _onProfilePictureUpdateRequested(
    BusinessProfileProfilePictureUpdateRequested event,
    Emitter<BusinessProfileState> emit,
  ) async {
    try {
      emit(BusinessProfileUpdating());
      final profile = await updateProfilePicture(event.filePath);
      emit(BusinessProfileLoaded(profile));
    } on AppException catch (error, stackTrace) {
      emit(BusinessProfileFailure(error.message, stackTrace));
    } catch (error, stackTrace) {
      emit(BusinessProfileFailure(error.toString(), stackTrace));
    }
  }

  Future<void> _onCoverImageUpdateRequested(
    BusinessProfileCoverImageUpdateRequested event,
    Emitter<BusinessProfileState> emit,
  ) async {
    try {
      emit(BusinessProfileUpdating());
      final profile = await updateCoverImage(event.filePath);
      emit(BusinessProfileLoaded(profile));
    } on AppException catch (error, stackTrace) {
      emit(BusinessProfileFailure(error.message, stackTrace));
    } catch (error, stackTrace) {
      emit(BusinessProfileFailure(error.toString(), stackTrace));
    }
  }

  Future<void> _onPinUpdateRequested(
    BusinessProfilePinUpdateRequested event,
    Emitter<BusinessProfileState> emit,
  ) async {
    try {
      emit(BusinessProfileUpdating());
      await updatePin(event.params);
      emit(BusinessProfilePinUpdated());
    } on AppException catch (error, stackTrace) {
      emit(BusinessProfileFailure(error.message, stackTrace));
    } catch (error, stackTrace) {
      emit(BusinessProfileFailure(error.toString(), stackTrace));
    }
  }
}
