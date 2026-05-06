// lib/core/navigation/transitions/types/custom.dart

part of '../transitions.dart';

abstract class CustomTransition {
  final BuildContext context;
  final Animation<double> animation;
  final Animation<double> secondaryAnimation;
  final Widget child;

  const CustomTransition(
    this.context,
    this.animation,
    this.secondaryAnimation,
    this.child,
  );

  Widget call();
}
