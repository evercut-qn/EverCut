// lib/core/connectivity/data/repositories/connectivity_repository_impl.dart

import 'package:connectivity_plus/connectivity_plus.dart';

import '../../domain/entities/connectivity_status.dart';
import '../../domain/repositories/connectivity_repository.dart';
import '../data_sources/platform/connectivity_platform_data_source.dart';
import '../data_sources/remote/internet_status_remote_data_source.dart';

class ConnectivityRepositoryImpl implements ConnectivityRepository {
  final ConnectivityPlatformDataSource platform;
  final InternetStatusRemoteDataSource remote;

  static const _validConnections = {
    ConnectivityResult.ethernet,
    ConnectivityResult.mobile,
    ConnectivityResult.wifi,
  };

  const ConnectivityRepositoryImpl(
    this.platform,
    this.remote,
  );

  @override
  Future<ConnectivityStatus> refresh() async {
    final List<ConnectivityResult> connectivityResults = await platform.checkConnectivity();
    return _mapConnectivityResultsToStatus(connectivityResults);
  }

  @override
  Stream<ConnectivityStatus> watch() async* {
    ConnectivityStatus? lastConnectivityStatus;
    await for (final List<ConnectivityResult> connectivityResults in platform.watchConnectivity()) {
      final connectivityStatus = await _mapConnectivityResultsToStatus(connectivityResults);
      if (connectivityStatus != lastConnectivityStatus) {
        lastConnectivityStatus = connectivityStatus;
        yield connectivityStatus;
      }
    }
  }

  Future<ConnectivityStatus> _mapConnectivityResultsToStatus(List<ConnectivityResult> connectivityResults) async {
    if (connectivityResults.isEmpty || !connectivityResults.any(_validConnections.contains)) {
      return ConnectivityStatus.disconnected;
    } else {
      if (await remote.hasInternetConnection()) {
        return ConnectivityStatus.connected;
      } else {
        return ConnectivityStatus.connectedNoInternet;
      }
    }
  }
}
