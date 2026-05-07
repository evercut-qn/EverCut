// lib/shared/widgets/overlays/snackbars.dart

import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/theme/foundation/app_icons.dart';
import '../../../core/theme/presentation/cubit/theme_cubit.dart';
import '../../extensions/context/app_colors_extension.dart';
import '../../extensions/context/device_metrics_extension.dart';

class SnackBars {
  final BuildContext context;

  const SnackBars._(this.context);

  factory SnackBars.of(BuildContext context) {
    return SnackBars._(context);
  }

  void showCustomSnackBar({
    required String title,
    required String message,
    Color? backgroundColor,
    Color? borderColor,
    Color? contentColor,
    Duration? duration,
    Icon? icon,
    EdgeInsets? margin,
    EdgeInsets? padding,
    bool showCloseButton = false,
    double? horizontalSpacing,
  }) {
    final Color textAndIconColor = () {
      if (contentColor == null) {
        if (context.read<ThemeCubit>().state.isDarkMode) {
          return Colors.white.withAlpha(127);
        } else {
          return Colors.white;
        }
      } else {
        return contentColor;
      }
    }();

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: Colors.transparent,
        behavior: SnackBarBehavior.floating,
        closeIconColor: textAndIconColor,
        elevation: 0,
        duration: duration ?? const Duration(seconds: 6),
        margin: margin ?? EdgeInsets.all(context.scale(12)),
        padding: EdgeInsets.zero,
        shape: const RoundedRectangleBorder(),
        content: ClipRRect(
          borderRadius: BorderRadius.circular(context.scale(12)),
          child: BackdropFilter(
            filter: ImageFilter.blur(
              sigmaX: context.scale(10),
              sigmaY: context.scale(10),
            ),
            child: Container(
              padding: padding ?? EdgeInsets.all(context.scale(20)),
              decoration: BoxDecoration(
                border: Border.all(
                  color: borderColor ?? Colors.white.withValues(alpha: 0.35),
                  width: context.scale(2),
                ),
                borderRadius: BorderRadius.circular(context.scale(12)),
                color: backgroundColor ?? Colors.white.withValues(alpha: 0.75),
              ),
              child: Row(
                spacing: horizontalSpacing ?? context.scale(20),
                children: [
                  ?icon,
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      spacing: context.scale(6),
                      children: [
                        Text(
                          title,
                          maxLines: 2,
                          style: TextStyle(
                            color: textAndIconColor,
                            fontSize: context.scale(16),
                            fontWeight: FontWeight.w700,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Text(
                          message,
                          maxLines: 10,
                          style: TextStyle(
                            color: textAndIconColor,
                            fontSize: context.scale(14),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (showCloseButton) ...[
                    TextButton(
                      onPressed: ScaffoldMessenger.of(context).hideCurrentSnackBar,
                      style: const ButtonStyle(
                        minimumSize: WidgetStatePropertyAll(Size.zero),
                        overlayColor: WidgetStateColor.transparent,
                        padding: WidgetStatePropertyAll(EdgeInsets.zero),
                        visualDensity: VisualDensity.compact,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      child: Icon(
                        AppIcons.solidRoundedRemoveCircle,
                        color: textAndIconColor,
                        size: context.scale(24),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  void showErrorSnackBar({
    required String title,
    required String message,
  }) {
    return showCustomSnackBar(
      title: title,
      message: message,
      backgroundColor: context.appColors.redShade100.withAlpha(127),
      borderColor: context.appColors.redShade100.withAlpha(31),
    );
  }

  void showSuccessSnackBar({
    required String title,
    required String message,
  }) {
    return showCustomSnackBar(
      title: title,
      message: message,
      backgroundColor: context.appColors.greenShade100.withAlpha(127),
      borderColor: context.appColors.greenShade100.withAlpha(31),
    );
  }

  void showWarningSnackBar({
    required String title,
    required String message,
  }) {
    return showCustomSnackBar(
      title: title,
      message: message,
      backgroundColor: context.appColors.orangeShade100.withAlpha(127),
      borderColor: context.appColors.orangeShade100.withAlpha(31),
    );
  }
}
