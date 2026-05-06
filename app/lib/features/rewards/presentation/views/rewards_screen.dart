// lib/features/rewards/presentation/views/rewards_screen.dart

import 'package:flutter/material.dart';

import '../../../../core/theme/foundation/app_icons.dart';
import '../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../shared/extensions/context/device_metrics_extension.dart';

class RewardsScreen extends StatelessWidget {
  const RewardsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Rewards')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.all(context.scale(24)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              DecoratedBox(
                decoration: BoxDecoration(
                  border: Border.all(color: context.appColors.backgroundShade300),
                  borderRadius: BorderRadius.circular(context.scale(12)),
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    colors: [
                      context.appColors.backgroundShade500,
                      context.appColors.backgroundShade300,
                      context.appColors.backgroundShade100,
                    ],
                    end: Alignment.bottomRight,
                    stops: const [0.0, 0.25, 1.0],
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Padding(
                      padding: EdgeInsets.all(context.scale(24)),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            spacing: context.scale(6),
                            children: [
                              Material(
                                color: context.appColors.orangeShade100,
                                shape: const CircleBorder(),
                                child: SizedBox.square(
                                  dimension: context.scale(6),
                                ),
                              ),
                              Text(
                                'MARCH 2026',
                                style: TextStyle(
                                  color: context.appColors.orangeShade100,
                                  fontSize: context.scale(12),
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                          Material(
                            color: context.appColors.backgroundShade300.withAlpha(191),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(context.scale(8)),
                              side: BorderSide(color: context.appColors.backgroundShade500),
                            ),
                            child: Padding(
                              padding: EdgeInsets.all(context.scale(12)),
                              child: Row(
                                spacing: context.scale(6),
                                children: [
                                  Icon(
                                    AppIcons.solidRoundedAward01,
                                    color: context.appColors.neutralShade650,
                                    size: context.scale(16),
                                  ),
                                  Text(
                                    'Active',
                                    style: TextStyle(
                                      color: context.appColors.neutralShade650,
                                      fontSize: context.scale(12),
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      height: 1.0,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            context.appColors.backgroundShade500,
                            context.appColors.backgroundShade300,
                          ],
                        ),
                      ),
                    ),
                    Padding(
                      padding: EdgeInsets.all(context.scale(24)),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        spacing: context.scale(32),
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            spacing: context.scale(12),
                            children: [
                              Text(
                                'TOTAL BOOKINGS',
                                style: TextStyle(
                                  color: context.appColors.neutralShade850,
                                  fontSize: context.scale(12),
                                  fontWeight: FontWeight.w700,
                                  height: 1.0,
                                ),
                              ),
                              Text(
                                '720',
                                style: TextStyle(
                                  fontSize: context.scale(36),
                                  fontWeight: FontWeight.w700,
                                  height: 1.0,
                                ),
                              ),
                            ],
                          ),
                          RewardProgressBar(
                            max: 1000,
                            current: 750,
                            checkpoints: [100, 700, 850],
                          ),
                          Material(
                            color: context.appColors.backgroundShade500.withAlpha(127),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(context.scale(12)),
                              side: BorderSide(color: context.appColors.backgroundShade300),
                            ),
                            child: Padding(
                              padding: EdgeInsets.all(context.scale(16)),
                              child: Row(
                                spacing: context.scale(12),
                                children: [
                                  Material(
                                    color: context.appColors.backgroundShade700.withAlpha(127),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(context.scale(6))),
                                    child: Padding(
                                      padding: EdgeInsets.all(context.scale(12)),
                                      child: Icon(
                                        AppIcons.solidRoundedFlash,
                                        color: context.appColors.greenShade100,
                                        size: context.scale(16),
                                      ),
                                    ),
                                  ),
                                  Expanded(
                                    child: RichText(
                                      text: TextSpan(
                                        text: 'Just ',
                                        style: TextStyle(
                                          color: context.appColors.neutralShade850,
                                          fontFamily: 'DMSans',
                                          fontSize: context.scale(12),
                                        ),
                                        children: <TextSpan>[
                                          TextSpan(
                                            text: '130 more bookings',
                                            style: TextStyle(
                                              color: context.appColors.greenShade100,
                                            ),
                                          ),
                                          const TextSpan(text: ' to reach your next reward!'),
                                        ],
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class RewardProgressBar extends StatelessWidget {
  final List<int> checkpoints;
  final double current;
  final double max;

  const RewardProgressBar({
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

    trackPaint.color = context.appColors.backgroundShade300;
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

    final startOuter = Paint()..color = startAchieved ? context.appColors.backgroundShade400 : context.appColors.backgroundShade200;
    final startInner = Paint()..color = startAchieved ? context.appColors.orangeShade100 : context.appColors.backgroundShade400;

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

      final circlePaint1 = Paint()..color = isAchieved ? context.appColors.backgroundShade400 : context.appColors.backgroundShade200;
      final circlePaint2 = Paint()..color = isAchieved ? context.appColors.orangeShade100 : context.appColors.backgroundShade400;

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

    final endOuter = Paint()..color = endAchieved ? context.appColors.backgroundShade400 : context.appColors.backgroundShade200;
    final endInner = Paint()..color = endAchieved ? context.appColors.orangeShade100 : context.appColors.backgroundShade400;

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
