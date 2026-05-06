// lib/core/navigation/transitions/types/slide_top.dart

part of '../transitions.dart';

class SlideTopTransition extends CustomTransition {
  const SlideTopTransition(
    super.context,
    super.animation,
    super.secondaryAnimation,
    super.child,
  );

  @override
  Widget call() {
    return SlideTransition(
      position: Tween<Offset>(
        begin: const Offset(0.0, -1.0),
        end: Offset.zero,
      ).animate(animation),
      child: child,
    );
  }
}
