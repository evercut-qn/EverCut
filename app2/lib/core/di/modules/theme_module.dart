// lib/core/di/modules/theme_module.dart

import 'package:get_it/get_it.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../theme/data/data_sources/local/theme_local_data_source.dart';
import '../../theme/data/data_sources/local/theme_local_data_source_impl.dart';
import '../../theme/data/repositories/theme_repository_impl.dart';
import '../../theme/domain/repositories/theme_repository.dart';
import '../../theme/domain/use_cases/get_theme_mode_use_case.dart';
import '../../theme/domain/use_cases/update_theme_mode_use_case.dart';
import '../../theme/presentation/cubit/theme_cubit.dart';

class ThemeModule {
  static void register(GetIt sl) {
    sl.registerSingletonWithDependencies<ThemeLocalDataSource>(
      () => ThemeLocalDataSourceImpl(sl<SharedPreferences>()),
      dependsOn: [SharedPreferences],
    );
    sl.registerSingletonWithDependencies<ThemeRepository>(
      () => ThemeRepositoryImpl(sl<ThemeLocalDataSource>()),
      dependsOn: [ThemeLocalDataSource],
    );
    sl.registerSingletonWithDependencies<GetThemeModeUseCase>(
      () => GetThemeModeUseCase(sl<ThemeRepository>()),
      dependsOn: [ThemeRepository],
    );
    sl.registerSingletonWithDependencies<UpdateThemeModeUseCase>(
      () => UpdateThemeModeUseCase(sl<ThemeRepository>()),
      dependsOn: [ThemeRepository],
    );
    sl.registerLazySingleton<ThemeCubit>(
      () => ThemeCubit(
        sl<GetThemeModeUseCase>(),
        sl<UpdateThemeModeUseCase>(),
      ),
      dispose: (ThemeCubit themeCubit) {
        return themeCubit.close();
      },
    );
  }
}
