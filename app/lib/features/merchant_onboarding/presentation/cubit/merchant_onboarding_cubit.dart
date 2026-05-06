// lib/features/merchant_onboarding/presentation/cubit/merchant_onboarding_cubit.dart

import 'package:flutter_bloc/flutter_bloc.dart';

class MerchantOnboardingCubit extends Cubit<int> {
  MerchantOnboardingCubit() : super(0);

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
