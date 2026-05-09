// lib/features/settings/modules/business_profile/domain/use_cases/use_cases/update_cover_image_use_case.dart

import '../repositories/business_profile_repository.dart';

class UpdateCoverImageUseCase {
  final BusinessProfileRepository repository;

  const UpdateCoverImageUseCase(this.repository);

  Future<ShopProfileEntity> call(String filePath) async {
    return await repository.updateCoverImage(filePath);
  }
}
