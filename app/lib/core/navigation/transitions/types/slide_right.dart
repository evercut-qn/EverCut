// lib/core/navigation/transitions/types/slide_right.dart

part of '../transitions.dart';

class SlideRightTransition extends CustomTransition {
  const SlideRightTransition(
    super.context,
    super.animation,
    super.secondaryAnimation,
    super.child,
  );

  @override
  Widget call() {
    return SlideTransition(
      position: Tween<Offset>(
        begin: const Offset(1.0, 0.0),
        end: Offset.zero,
      ).animate(animation),
      child: child,
    );
  }
}
