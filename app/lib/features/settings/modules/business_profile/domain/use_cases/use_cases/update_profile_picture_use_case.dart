// lib/features/settings/modules/business_profile/domain/use_cases/use_cases/update_profile_picture_use_case.dart

import '../repositories/business_profile_repository.dart';

class UpdateProfilePictureUseCase {
  final BusinessProfileRepository repository;

  const UpdateProfilePictureUseCase(this.repository);

  Future<ShopProfileEntity> call(String filePath) async {
    return await repository.updateProfilePicture(filePath);
  }
}
