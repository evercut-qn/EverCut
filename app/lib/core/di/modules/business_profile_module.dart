// lib/core/di/modules/business_profile_module.dart

import 'package:get_it/get_it.dart';
import 'package:http/http.dart' as http;

import '../../../features/authentication/data/data_sources/local/authentication_local_data_source.dart';
import '../../../features/settings/modules/business_profile/data/data_sources/remote/business_profile_remote_data_source.dart';
import '../../../features/settings/modules/business_profile/data/data_sources/remote/business_profile_remote_data_source_impl.dart';
import '../../../features/settings/modules/business_profile/data/repositories/business_profile_repository_impl.dart';
import '../../../features/settings/modules/business_profile/domain/repositories/business_profile_repository.dart';
import '../../../features/settings/modules/business_profile/domain/use_cases/use_cases/get_shop_profile_use_case.dart';
import '../../../features/settings/modules/business_profile/domain/use_cases/use_cases/update_business_profile_use_case.dart';
import '../../../features/settings/modules/business_profile/domain/use_cases/use_cases/update_cover_image_use_case.dart';
import '../../../features/settings/modules/business_profile/domain/use_cases/use_cases/update_payout_details_use_case.dart';
import '../../../features/settings/modules/business_profile/domain/use_cases/use_cases/update_pin_use_case.dart';
import '../../../features/settings/modules/business_profile/domain/use_cases/use_cases/update_profile_picture_use_case.dart';
import '../../../features/settings/modules/business_profile/presentation/bloc/business_profile_bloc.dart';

class BusinessProfileModule {
  static void register(GetIt sl) {
    sl.registerLazySingleton<BusinessProfileRemoteDataSource>(
      () => BusinessProfileRemoteDataSourceImpl(
        sl<http.Client>(),
        sl<AuthenticationLocalDataSource>(),
      ),
    );

    sl.registerLazySingleton<BusinessProfileRepository>(
      () => BusinessProfileRepositoryImpl(
        sl<BusinessProfileRemoteDataSource>(),
      ),
    );

    sl.registerLazySingleton<GetShopProfileUseCase>(() => GetShopProfileUseCase(sl<BusinessProfileRepository>()));
    sl.registerLazySingleton<UpdateBusinessProfileUseCase>(() => UpdateBusinessProfileUseCase(sl<BusinessProfileRepository>()));
    sl.registerLazySingleton<UpdatePayoutDetailsUseCase>(() => UpdatePayoutDetailsUseCase(sl<BusinessProfileRepository>()));
    sl.registerLazySingleton<UpdateProfilePictureUseCase>(() => UpdateProfilePictureUseCase(sl<BusinessProfileRepository>()));
    sl.registerLazySingleton<UpdateCoverImageUseCase>(() => UpdateCoverImageUseCase(sl<BusinessProfileRepository>()));
    sl.registerLazySingleton<UpdatePinUseCase>(() => UpdatePinUseCase(sl<BusinessProfileRepository>()));

    sl.registerFactory<BusinessProfileBloc>(
      () => BusinessProfileBloc(
        sl<GetShopProfileUseCase>(),
        sl<UpdateBusinessProfileUseCase>(),
        sl<UpdatePayoutDetailsUseCase>(),
        sl<UpdateProfilePictureUseCase>(),
        sl<UpdateCoverImageUseCase>(),
        sl<UpdatePinUseCase>(),
      ),
      dispose: (BusinessProfileBloc bloc) => bloc.close(),
    );
  }
}
