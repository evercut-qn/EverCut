// lib/core/navigation/transitions/types/zoom_in.dart

part of '../transitions.dart';

class ZoomInTransition extends CustomTransition {
  const ZoomInTransition(
    super.context,
    super.animation,
    super.secondaryAnimation,
    super.child,
  );

  @override
  Widget call() {
    return ScaleTransition(
      scale: animation,
      child: child,
    );
  }
}
