import 'package:image_picker/image_picker.dart';

import '../../../../core/auth/auth_session.dart';

abstract class MerchantOnboardingRepository {
  Future<AuthSession> completeOnboarding({
    required Map<String, dynamic> fields,
    required List<XFile> photos,
  });
}
