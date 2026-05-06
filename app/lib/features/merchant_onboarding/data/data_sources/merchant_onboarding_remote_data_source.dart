import 'package:image_picker/image_picker.dart';

import '../../../../core/auth/auth_session.dart';

abstract class MerchantOnboardingRemoteDataSource {
  Future<AuthSession> createBarberProfile({
    required String onboardingToken,
    required Map<String, dynamic> fields,
    required List<XFile> photos,
  });
}
