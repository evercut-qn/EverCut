// lib/core/connectivity/domain/use_cases/refresh_connectivity_use_case.dart

import '../entities/connectivity_status.dart';
import '../repositories/connectivity_repository.dart';

class RefreshConnectivityUseCase {
  final ConnectivityRepository repository;

  const RefreshConnectivityUseCase(this.repository);

  Future<ConnectivityStatus> call() {
    return repository.refresh();
  }
}
