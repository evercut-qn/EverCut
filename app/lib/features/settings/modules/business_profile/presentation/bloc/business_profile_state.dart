// lib/features/settings/modules/business_profile/presentation/bloc/business_profile_state.dart

part of 'business_profile_bloc.dart';

abstract class BusinessProfileState {}

class BusinessProfileInitial extends BusinessProfileState {}

class BusinessProfileLoading extends BusinessProfileState {}

class BusinessProfileUpdating extends BusinessProfileState {}

class BusinessProfileLoaded extends BusinessProfileState {
  final ShopProfileEntity profile;

  BusinessProfileLoaded(this.profile);
}

class BusinessProfilePinUpdated extends BusinessProfileState {}

class BusinessProfileFailure extends BusinessProfileState {
  final String message;
  final StackTrace? stackTrace;

  BusinessProfileFailure(this.message, this.stackTrace);
}
