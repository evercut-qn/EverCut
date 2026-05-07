// lib/core/navigation/transitions/transitions.dart

import 'package:flutter/widgets.dart';

part 'types/custom.dart';
part 'types/fade.dart';
part 'types/left_to_right_fade.dart';
part 'types/no.dart';
part 'types/right_to_left_fade.dart';
part 'types/scale_fade.dart';
part 'types/slide_bottom.dart';
part 'types/slide_left.dart';
part 'types/slide_right.dart';
part 'types/slide_top.dart';
part 'types/zoom_in.dart';

enum Transitions {
  fade,
  leftToRightFade,
  noTransition,
  rightToLeftFade,
  scaleFade,
  slideBottom,
  slideLeft,
  slideRight,
  slideTop,
  zoomIn,
}

extension TransitionsExtension on Transitions {
  Widget buildTransition(
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    switch (this) {
      case Transitions.fade:
        return FadeInTransition(
          context,
          animation,
          secondaryAnimation,
          child,
        ).call();
      case Transitions.leftToRightFade:
        return LeftToRightFadeTransition(
          context,
          animation,
          secondaryAnimation,
          child,
        ).call();
      case Transitions.noTransition:
        return NoTransition(
          context,
          animation,
          secondaryAnimation,
          child,
        ).call();
      case Transitions.rightToLeftFade:
        return RightToLeftFadeTransition(
          context,
          animation,
          secondaryAnimation,
          child,
        ).call();
      case Transitions.scaleFade:
        return ScaleFadeTransition(
          context,
          animation,
          secondaryAnimation,
          child,
        ).call();
      case Transitions.slideBottom:
        return SlideBottomTransition(
          context,
          animation,
          secondaryAnimation,
          child,
        ).call();
      case Transitions.slideLeft:
        return SlideLeftTransition(
          context,
          animation,
          secondaryAnimation,
          child,
        ).call();
      case Transitions.slideRight:
        return SlideRightTransition(
          context,
          animation,
          secondaryAnimation,
          child,
        ).call();
      case Transitions.slideTop:
        return SlideTopTransition(
          context,
          animation,
          secondaryAnimation,
          child,
        ).call();
      case Transitions.zoomIn:
        return ZoomInTransition(
          context,
          animation,
          secondaryAnimation,
          child,
        ).call();
    }
  }
}
