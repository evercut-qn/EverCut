// lib/shared/widgets/other/expandable_text/expandable_text.dart

import 'package:flutter/material.dart';

class ExpandableText extends StatefulWidget {
  final int maxLines;
  final ValueChanged<bool>? onExpandedChanged;
  final TextStyle? style;
  final String text;
  final TextAlign? textAlign;

  const ExpandableText(
    this.text, {
    super.key,
    this.maxLines = 2,
    this.onExpandedChanged,
    this.style,
    this.textAlign,
  });

  @override
  State<ExpandableText> createState() => _ExpandableTextState();
}

class _ExpandableTextState extends State<ExpandableText> {
  bool _isExpanded = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        setState(() => _isExpanded = !_isExpanded);
        widget.onExpandedChanged?.call(_isExpanded);
      },
      child: AnimatedCrossFade(
        crossFadeState: _isExpanded ? CrossFadeState.showSecond : CrossFadeState.showFirst,
        duration: const Duration(milliseconds: 150),
        firstChild: Text(
          widget.text,
          maxLines: widget.maxLines,
          textAlign: widget.textAlign,
          style: widget.style?.copyWith(
            overflow: TextOverflow.ellipsis,
          ),
        ),
        secondChild: Text(
          widget.text,
          textAlign: widget.textAlign,
          style: widget.style,
        ),
      ),
    );
  }
}
