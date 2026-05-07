// lib/core/navigation/transitions/types/no.dart

part of '../transitions.dart';

class NoTransition extends CustomTransition {
  const NoTransition(
    super.context,
    super.animation,
    super.secondaryAnimation,
    super.child,
  );

  @override
  Widget call() {
    return child;
  }
}
