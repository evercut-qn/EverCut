// lib/shared/widgets/common/dividers/centered_text_divider.dart

import 'package:flutter/material.dart';

import '../../../extensions/context/device_metrics_extension.dart';

class CenteredTextDivider extends StatelessWidget {
  final String text;
  final TextStyle? style;

  const CenteredTextDivider(
    this.text, {
    super.key,
    this.style,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      spacing: context.scale(8),
      children: [
        Expanded(child: Divider()),
        Text(
          text,
          style: style ?? TextStyle(fontSize: context.scale(12.5)),
        ),
        Expanded(child: Divider()),
      ],
    );
  }
}
