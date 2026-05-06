// lib/features/image_gallery/presentation/widgets/image_preview_dialog.dart

import 'package:flutter/material.dart';

import '../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../shared/extensions/context/device_metrics_extension.dart';

class ImagePreviewDialog extends StatelessWidget {
  const ImagePreviewDialog({super.key});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.all(context.scale(24)),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            AspectRatio(
              aspectRatio: 0.71,
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.vertical(
                    top: Radius.circular(context.scale(24)),
                  ),
                  color: Colors.grey,
                ),
              ),
            ),
            Material(
              borderRadius: BorderRadius.vertical(
                bottom: Radius.circular(context.scale(24)),
              ),
              clipBehavior: Clip.hardEdge,
              color: context.appColors.neutralShade50,
              child: InkWell(
                onTap: () {},
                splashColor: context.appColors.neutralShade100.withAlpha(127),
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
    );
  }
}
