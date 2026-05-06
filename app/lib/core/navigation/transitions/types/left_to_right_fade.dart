// lib/core/navigation/transitions/types/left_to_right_fade.dart

part of '../transitions.dart';

class LeftToRightFadeTransition extends CustomTransition {
  const LeftToRightFadeTransition(
    super.context,
    super.animation,
    super.secondaryAnimation,
    super.child,
  );

  @override
  Widget call() {
    return SlideTransition(
      position: Tween<Offset>(
        begin: const Offset(-1.0, 0.0),
        end: Offset.zero,
      ).animate(animation),
      child: FadeTransition(
        opacity: animation,
        child: SlideTransition(
          position: Tween<Offset>(
            begin: Offset.zero,
            end: const Offset(1.0, 0.0),
          ).animate(secondaryAnimation),
          child: child,
        ),
      ),
    );
  }
}
