// lib/features/dashboard/modules/gallery/presentation/widgets/preview_dialog.dart

import 'dart:ui';

import 'package:flutter/material.dart';

import '../../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../../shared/extensions/context/device_metrics_extension.dart';

class PreviewDialogWidget extends StatelessWidget {
  const PreviewDialogWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return BackdropFilter(
      filter: ImageFilter.blur(
        sigmaX: context.scale(8),
        sigmaY: context.scale(8),
      ),
      child: SafeArea(
        child: Padding(
          padding: EdgeInsets.all(context.scale(24)),
          child: Center(
            child: Material(
              borderRadius: BorderRadius.circular(context.scale(24)),
              clipBehavior: Clip.hardEdge,
              color: Colors.transparent,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                mainAxisAlignment: MainAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                  AspectRatio(
                    aspectRatio: 0.67,
                    child: ColoredBox(
                      color: context.appColors.backgroundShade100,
                    ),
                  ),
                  ColoredBox(
                    color: context.appColors.backgroundShade50,
                    child: InkWell(
                      highlightColor: context.appColors.backgroundShade200.withAlpha(63),
                      onTap: () {},
                      splashColor: context.appColors.backgroundShade200.withAlpha(127),
                      child: Padding(
                        padding: EdgeInsets.all(context.scale(18)),
                        child: Center(
                          child: Text(
                            'Delete',
                            style: TextStyle(
                              color: context.appColors.redShade300,
                              fontSize: context.scale(14),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
