// lib/features/merchant_onboarding/presentation/cubit/merchant_onboarding_cubit.dart

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:image_picker/image_picker.dart';

class MerchantOnboardingDraft {
  final Map<String, dynamic> fields;
  final List<XFile> photos;

  const MerchantOnboardingDraft({
    this.fields = const <String, dynamic>{},
    this.photos = const <XFile>[],
  });

  MerchantOnboardingDraft copyWith({
    Map<String, dynamic>? fields,
    List<XFile>? photos,
  }) {
    return MerchantOnboardingDraft(
      fields: fields ?? this.fields,
      photos: photos ?? this.photos,
    );
  }
}

class MerchantOnboardingCubit extends Cubit<int> {
  MerchantOnboardingCubit() : super(0);
  MerchantOnboardingDraft draft = const MerchantOnboardingDraft();

  void updateFields(Map<String, dynamic> fields) {
    draft = draft.copyWith(
      fields: {
        ...draft.fields,
        ...fields,
      },
    );
  }

  void updatePhotos(List<XFile> photos) {
    draft = draft.copyWith(photos: photos);
  }

  void nextPage() {
    if (state <= 3) {
      emit(state + 1);
    }
  }

  void previousPage() {
    if (state > 0) {
      emit(state - 1);
    }
  }
}
