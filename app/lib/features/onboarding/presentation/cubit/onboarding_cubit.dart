// lib/features/onboarding/presentation/cubit/onboarding_cubit.dart

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:image_picker/image_picker.dart';

class OnboardingDraft {
  final Map<String, dynamic> fields;
  final List<XFile> photos;

  const OnboardingDraft({
    this.fields = const <String, dynamic>{},
    this.photos = const <XFile>[],
  });

  OnboardingDraft copyWith({
    Map<String, dynamic>? fields,
    List<XFile>? photos,
  }) {
    return OnboardingDraft(
      fields: fields ?? this.fields,
      photos: photos ?? this.photos,
    );
  }
}

class OnboardingCubit extends Cubit<int> {
  OnboardingCubit() : super(0);
  OnboardingDraft draft = const OnboardingDraft();

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
