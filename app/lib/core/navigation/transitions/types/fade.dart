// lib/core/navigation/transitions/types/fade.dart

part of '../transitions.dart';

class FadeInTransition extends CustomTransition {
  const FadeInTransition(
    super.context,
    super.animation,
    super.secondaryAnimation,
    super.child,
  );

  @override
  Widget call() {
    return FadeTransition(
      opacity: animation,
      child: child,
    );
  }
}
