// lib/features/authentication/presentation/cubit/otp_resend_cubit.dart

import 'dart:async';

import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

part 'otp_resend_state.dart';

class OtpResendCubit extends Cubit<OtpResendState> {
  static const List<int> _cooldownSeconds = [30, 120, 300, 900, 1800, 86400];
  Timer? _timer;

  OtpResendCubit() : super(OtpResendState.defaultState());

  void init(int resendAttempts, DateTime? lastAttemptTime) {
    _cancelTimer();

    int remaining = 0;

    if (resendAttempts > 0 && lastAttemptTime != null) {
      final int cooldown = _getCooldownForAttempts(resendAttempts);
      final DateTime nextAllowedTime = lastAttemptTime.add(Duration(seconds: cooldown));
      final int difference = nextAllowedTime.difference(DateTime.now()).inSeconds;

      if (difference >= 0) {
        remaining = difference;
      }
    }

    final newState = OtpResendState(
      remainingSeconds: remaining,
      resendAttempts: resendAttempts,
      lastAttemptTime: lastAttemptTime,
    );

    emit(newState);

    if (remaining > 0 && !newState.locked) {
      _startTimer();
    }
  }

  void startTimer() {
    if (!state.canResend) {
      return;
    } else {
      final int nextCooldown = _getCooldownForAttempts(state.resendAttempts);
      final OtpResendState newState = state.copyWith(
        lastAttemptTime: DateTime.now(),
        remainingSeconds: nextCooldown,
        resendAttempts: state.resendAttempts + 1,
      );

      emit(newState);

      if (nextCooldown > 0 && !newState.locked) {
        _startTimer();
      }
    }
  }

  int _getCooldownForAttempts(int attempts) {
    return _cooldownSeconds[attempts < _cooldownSeconds.length ? attempts : _cooldownSeconds.length - 1];
  }

  void _startTimer() {
    _cancelTimer();
    if (state.locked) {
      return;
    } else {
      _timer = Timer.periodic(const Duration(seconds: 1), (_) {
        if (state.locked) {
          _cancelTimer();
          return;
        } else {
          if (state.remainingSeconds <= 1) {
            _cancelTimer();
            emit(
              state.copyWith(
                remainingSeconds: 0,
              ),
            );
          } else {
            emit(
              state.copyWith(
                remainingSeconds: state.remainingSeconds - 1,
              ),
            );
          }
        }
      });
    }
  }

  void _cancelTimer() {
    _timer?.cancel();
    _timer = null;
  }

  @override
  Future<void> close() {
    _cancelTimer();
    return super.close();
  }
}
