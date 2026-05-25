// lib/core/navigation/transitions/types/scale_fade.dart

part of '../transitions.dart';

class ScaleFadeTransition extends CustomTransition {
  const ScaleFadeTransition(
    super.context,
    super.animation,
    super.secondaryAnimation,
    super.child,
  );

  @override
  Widget call() {
    return ScaleTransition(
      scale: CurvedAnimation(
        parent: animation,
        curve: Curves.linear,
      ),
      child: FadeTransition(
        opacity: animation,
        child: child,
      ),
    );
  }
}
