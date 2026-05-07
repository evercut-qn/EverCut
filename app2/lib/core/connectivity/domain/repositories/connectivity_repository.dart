// lib/core/connectivity/domain/repositories/connectivity_repository.dart

import '../entities/connectivity_status.dart';

abstract class ConnectivityRepository {
  Future<ConnectivityStatus> refresh();
  Stream<ConnectivityStatus> watch();
}
