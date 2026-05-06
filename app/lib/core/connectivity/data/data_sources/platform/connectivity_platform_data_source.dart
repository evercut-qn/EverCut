// lib/core/connectivity/data/data_sources/platform/connectivity_platform_data_source.dart

import 'package:connectivity_plus/connectivity_plus.dart';

abstract class ConnectivityPlatformDataSource {
  Future<List<ConnectivityResult>> checkConnectivity();
  Stream<List<ConnectivityResult>> watchConnectivity();
}
