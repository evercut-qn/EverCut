import 'package:get_it/get_it.dart';
import 'package:http/http.dart' as http;

import '../../auth/session_store.dart';
import '../../network/api_client.dart';

class NetworkModule {
  static void register(GetIt sl) {
    if (!sl.isRegistered<http.Client>()) {
      sl.registerLazySingleton<http.Client>(() => http.Client());
    }

    sl.registerSingletonWithDependencies<ApiClient>(
      () => ApiClient(
        sl<http.Client>(),
        sl<SessionStore>(),
      ),
      dependsOn: [SessionStore],
    );
  }
}
