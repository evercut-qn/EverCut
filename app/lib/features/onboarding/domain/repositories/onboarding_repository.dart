import 'package:image_picker/image_picker.dart';

import '../../../../core/auth/auth_session.dart';

abstract class OnboardingRepository {
  Future<AuthSession> completeOnboarding({
    required Map<String, dynamic> fields,
    required XFile photo,
  });
}
