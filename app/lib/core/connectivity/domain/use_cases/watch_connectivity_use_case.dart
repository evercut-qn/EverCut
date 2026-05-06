// lib/core/connectivity/domain/use_cases/watch_connectivity_use_case.dart

import '../entities/connectivity_status.dart';
import '../repositories/connectivity_repository.dart';

class WatchConnectivityUseCase {
  final ConnectivityRepository repository;

  const WatchConnectivityUseCase(this.repository);

  Stream<ConnectivityStatus> call() {
    return repository.watch();
  }
}
