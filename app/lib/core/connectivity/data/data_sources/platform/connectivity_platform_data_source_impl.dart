// lib/core/connectivity/data/data_sources/platform/connectivity_platform_data_source_impl.dart

import 'package:connectivity_plus/connectivity_plus.dart';

import 'connectivity_platform_data_source.dart';

class ConnectivityPlatformDataSourceImpl implements ConnectivityPlatformDataSource {
  final Connectivity connectivity;

  const ConnectivityPlatformDataSourceImpl(this.connectivity);

  @override
  Future<List<ConnectivityResult>> checkConnectivity() {
    return connectivity.checkConnectivity();
  }

  @override
  Stream<List<ConnectivityResult>> watchConnectivity() {
    return connectivity.onConnectivityChanged;
  }
}
