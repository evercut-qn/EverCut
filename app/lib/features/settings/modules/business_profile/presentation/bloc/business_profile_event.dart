// lib/features/settings/modules/business_profile/presentation/bloc/business_profile_event.dart

part of 'business_profile_bloc.dart';

abstract class BusinessProfileEvent {}

class BusinessProfileFetchRequested extends BusinessProfileEvent {}

class BusinessProfileUpdateRequested extends BusinessProfileEvent {
  final UpdateBusinessProfileParams params;

  BusinessProfileUpdateRequested(this.params);
}

class BusinessProfilePayoutDetailsUpdateRequested extends BusinessProfileEvent {
  final UpdatePayoutDetailsParams params;

  BusinessProfilePayoutDetailsUpdateRequested(this.params);
}

class BusinessProfileProfilePictureUpdateRequested extends BusinessProfileEvent {
  final String filePath;

  BusinessProfileProfilePictureUpdateRequested(this.filePath);
}

class BusinessProfileCoverImageUpdateRequested extends BusinessProfileEvent {
  final String filePath;

  BusinessProfileCoverImageUpdateRequested(this.filePath);
}

class BusinessProfilePinUpdateRequested extends BusinessProfileEvent {
  final UpdatePinParams params;

  BusinessProfilePinUpdateRequested(this.params);
}
