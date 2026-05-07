// lib/features/dashboard/modules/rewards/presentation/widgets/reward_progress_bar.dart

import 'package:flutter/material.dart';

import '../../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../../shared/extensions/context/device_metrics_extension.dart';

class RewardProgressBarWidget extends StatelessWidget {
  final List<int> checkpoints;
  final double current;
  final double max;

  const RewardProgressBarWidget({
    super.key,
    required this.checkpoints,
    required this.current,
    required this.max,
  });

  @override
  Widget build(BuildContext context) {
    checkpoints.sort();
    return SizedBox(
      height: context.scale(39.4),
      width: double.infinity,
      child: CustomPaint(
        painter: _RewardPainter(
          checkpoints: checkpoints.toSet(),
          context: context,
          current: current,
          max: max,
        ),
      ),
    );
  }
}

class _RewardPainter extends CustomPainter {
  final Set<int> checkpoints;
  final BuildContext context;
  final double current;
  final double max;

  _RewardPainter({
    required this.checkpoints,
    required this.context,
    required this.current,
    required this.max,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final trackPaint = Paint();

    trackPaint.color = context.appColors.backgroundShade200;
    trackPaint.strokeWidth = context.scale(8);
    trackPaint.strokeCap = StrokeCap.round;

    final progressPaint = Paint();

    progressPaint.color = context.appColors.greenShade100;
    progressPaint.strokeWidth = context.scale(8);
    progressPaint.strokeCap = StrokeCap.round;

    final double startX = context.scale(4);
    final double endX = size.width - context.scale(4);
    final double y = context.scale(8);

    canvas.drawLine(Offset(startX, y), Offset(endX, y), trackPaint);
    canvas.drawLine(Offset(startX, y), Offset(startX + (current / max) * (endX - startX), y), progressPaint);

    final bool startAchieved = current >= 0;

    final startOuter = Paint()..color = context.appColors.backgroundShade50;
    final startInner = Paint()..color = startAchieved ? context.appColors.orangeShade100 : context.appColors.backgroundShade300;

    canvas.drawCircle(Offset(startX, y), context.scale(8), startOuter);
    canvas.drawCircle(Offset(startX, y), context.scale(6), startInner);

    final startTextPainter = TextPainter(
      text: TextSpan(
        text: '0',
        style: TextStyle(
          color: startAchieved ? context.appColors.orangeShade100 : context.appColors.neutralShade650,
          fontFamily: 'DMSans',
          fontSize: context.scale(12),
          fontWeight: FontWeight.w700,
        ),
      ),
      textDirection: TextDirection.ltr,
    );

    startTextPainter.layout();
    startTextPainter.paint(canvas, Offset(startX - startTextPainter.width / 2, y + context.scale(14)));

    for (var checkpoint in checkpoints) {
      final x = startX + (checkpoint / max) * (endX - startX);
      final isAchieved = current >= checkpoint;

      final circlePaint1 = Paint()..color = context.appColors.backgroundShade50;
      final circlePaint2 = Paint()..color = isAchieved ? context.appColors.orangeShade100 : context.appColors.backgroundShade300;

      canvas.drawCircle(Offset(x, y), context.scale(8), circlePaint1);
      canvas.drawCircle(Offset(x, y), context.scale(6), circlePaint2);

      final textPainter = TextPainter(
        text: TextSpan(
          text: '$checkpoint',
          style: TextStyle(
            color: isAchieved ? context.appColors.orangeShade100 : context.appColors.neutralShade650,
            fontFamily: 'DMSans',
            fontSize: context.scale(12),
            fontWeight: FontWeight.w700,
          ),
        ),
        textDirection: TextDirection.ltr,
      );

      textPainter.layout();
      textPainter.paint(canvas, Offset(x - textPainter.width / 2, y + context.scale(14)));
    }

    final bool endAchieved = current >= max;

    final endOuter = Paint()..color = context.appColors.backgroundShade50;
    final endInner = Paint()..color = endAchieved ? context.appColors.orangeShade100 : context.appColors.backgroundShade300;

    canvas.drawCircle(Offset(endX, y), context.scale(8), endOuter);
    canvas.drawCircle(Offset(endX, y), context.scale(6), endInner);

    final endTextPainter = TextPainter(
      text: TextSpan(
        text: max.toStringAsFixed(0),
        style: TextStyle(
          color: endAchieved ? context.appColors.orangeShade100 : context.appColors.neutralShade650,
          fontFamily: 'DMSans',
          fontSize: context.scale(12),
          fontWeight: FontWeight.w700,
        ),
      ),
      textDirection: TextDirection.ltr,
    );

    endTextPainter.layout();
    endTextPainter.paint(canvas, Offset(endX - endTextPainter.width / 2, y + context.scale(14)));
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) {
    return true;
  }
}
