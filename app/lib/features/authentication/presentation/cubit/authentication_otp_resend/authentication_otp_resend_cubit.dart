// lib/features/authentication/presentation/cubit/authentication_otp_resend/authentication_otp_resend.dart

import 'dart:async';

import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../domain/policies/otp/authentication_otp_resend_policy.dart';

part 'authentication_otp_resend_state.dart';

class AuthenticationOtpResendCubit extends Cubit<AuthenticationOtpResendState> {
  final AuthenticationOtpResendPolicy authenticationOtpResendPolicy;

  Timer? _timer;

  AuthenticationOtpResendCubit({
    required this.authenticationOtpResendPolicy,
  }) : super(AuthenticationOtpResendState.initial());

  void init({
    required int resendAttempts,
    required DateTime? lastAttemptTime,
  }) {
    _cancelTimer();

    final int remainingSeconds = authenticationOtpResendPolicy.calculateRemainingSeconds(
      resendAttempts: resendAttempts,
      lastAttemptTime: lastAttemptTime,
    );

    emit(
      AuthenticationOtpResendState(
        lastAttemptTime: lastAttemptTime,
        remainingSeconds: remainingSeconds,
        resendAttempts: resendAttempts,
      ),
    );

    if (remainingSeconds > 0 && !authenticationOtpResendPolicy.isLocked(remainingSeconds)) {
      _startTimer();
    }
  }

  void startCooldown() {
    if (!authenticationOtpResendPolicy.canResend(state.remainingSeconds)) {
      return;
    } else {
      final int nextCooldown = authenticationOtpResendPolicy.getCooldownForAttempts(state.resendAttempts);

      emit(
        state.copyWith(
          lastAttemptTime: DateTime.now(),
          remainingSeconds: nextCooldown,
          resendAttempts: state.resendAttempts + 1,
        ),
      );

      if (nextCooldown > 0 && !authenticationOtpResendPolicy.isLocked(nextCooldown)) {
        _startTimer();
      }
    }
  }

  void reset() {
    _cancelTimer();

    emit(AuthenticationOtpResendState.initial());
  }

  void _startTimer() {
    _cancelTimer();

    if (authenticationOtpResendPolicy.isLocked(state.remainingSeconds)) {
      return;
    } else {
      _timer = Timer.periodic(const Duration(seconds: 1), (_) {
        if (authenticationOtpResendPolicy.isLocked(state.remainingSeconds)) {
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

            return;
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
