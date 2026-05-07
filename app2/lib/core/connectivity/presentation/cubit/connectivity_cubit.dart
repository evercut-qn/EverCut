// lib/core/connectivity/presentation/cubit/connectivity_cubit.dart

import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';

import '../../domain/entities/connectivity_status.dart';
import '../../domain/use_cases/refresh_connectivity_use_case.dart';
import '../../domain/use_cases/watch_connectivity_use_case.dart';

class ConnectivityCubit extends Cubit<ConnectivityStatus> {
  final RefreshConnectivityUseCase refreshConnectivity;
  final WatchConnectivityUseCase watchConnectivity;

  StreamSubscription<ConnectivityStatus>? _connectivityStatusSubscription;

  ConnectivityCubit(
    this.refreshConnectivity,
    this.watchConnectivity,
  ) : super(ConnectivityStatus.disconnected);

  Future<void> start() async {
    await _connectivityStatusSubscription?.cancel();
    _connectivityStatusSubscription = watchConnectivity().listen((ConnectivityStatus connectivityStatus) {
      if (state != connectivityStatus) {
        emit(connectivityStatus);
      }
    });
  }

  Future<void> refresh() async {
    final connectivityStatus = await refreshConnectivity();
    if (state != connectivityStatus) {
      emit(connectivityStatus);
    }
  }

  @override
  Future<void> close() {
    _connectivityStatusSubscription?.cancel();
    return super.close();
  }
}
