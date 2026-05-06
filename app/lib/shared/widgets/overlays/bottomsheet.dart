// lib/shared/widgets/overlays/bottomsheet.dart

import 'package:flutter/material.dart';

import '../../extensions/context/app_colors_extension.dart';
import '../../extensions/context/device_metrics_extension.dart';

Future<T?> showCustomBottomsheet<T>({
  required BuildContext context,
  required WidgetBuilder builder,
  bool isDismissible = true,
  VoidCallback? onClose,
  EdgeInsets? padding,
  bool scrollable = true,
}) {
  return showModalBottomSheet<T>(
    backgroundColor: Colors.transparent,
    barrierColor: Colors.black.withAlpha(0x15),
    builder: (BuildContext context) {
      return _CustomBottomsheet(
        padding: padding,
        scrollable: scrollable,
        child: builder(context),
      );
    },
    context: context,
    isDismissible: isDismissible,
    isScrollControlled: true,
    useSafeArea: true,
  ).whenComplete(() {
    if (onClose != null) {
      onClose();
    }
  });
}

class _CustomBottomsheet extends StatelessWidget {
  final EdgeInsets? padding;
  final bool scrollable;
  final Widget child;

  const _CustomBottomsheet({
    this.padding,
    required this.scrollable,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.all(context.scale(12)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: context.scale(8)),
                child: Material(
                  borderRadius: BorderRadius.circular(context.scale(3)),
                  color: context.appColors.bottomsheetBackgroundColor,
                  child: SizedBox(
                    height: context.scale(6),
                    width: context.scale(80),
                  ),
                ),
              ),
            ),
            Flexible(
              child: Material(
                borderRadius: BorderRadius.circular(context.scale(16)),
                clipBehavior: Clip.hardEdge,
                color: context.appColors.bottomsheetBackgroundColor,
                child: Padding(
                  padding: padding ?? EdgeInsets.all(context.scale(20)),
                  child: () {
                    if (scrollable) {
                      return SingleChildScrollView(
                        scrollDirection: Axis.vertical,
                        child: child,
                      );
                    } else {
                      return child;
                    }
                  }(),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
