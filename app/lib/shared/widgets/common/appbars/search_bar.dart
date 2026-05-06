// lib/shared/widgets/common/appbars/search_bar.dart

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../extensions/context/app_colors_extension.dart';
import '../../../extensions/context/device_metrics_extension.dart';

class CustomSearchBar extends StatefulWidget {
  final bool autoFocus;
  final TextEditingController controller;
  final Color? dividerColor;
  final String hintText;
  final ValueSetter<String>? onChanged;
  final VoidCallback? onClear;
  final ValueSetter<String>? onSubmitted;

  const CustomSearchBar({
    super.key,
    this.autoFocus = false,
    required this.controller,
    this.dividerColor,
    required this.hintText,
    this.onChanged,
    this.onClear,
    this.onSubmitted,
  });

  @override
  State<CustomSearchBar> createState() => _CustomSearchBarState();
}

class _CustomSearchBarState extends State<CustomSearchBar> {
  final FocusNode _focusNode = FocusNode();
  bool _isTyping = false;

  void _clearField() {
    widget.controller.clear();

    setState(() => _isTyping = false);

    if (!_focusNode.hasFocus) {
      _focusNode.requestFocus();
    }

    if (widget.onClear != null) {
      widget.onClear!();
    }
  }

  @override
  void dispose() {
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(
            color: widget.dividerColor ?? context.appColors.primaryDividerColor,
          ),
        ),
      ),
      padding: EdgeInsets.all(context.scale(12)),
      child: SearchBar(
        autoFocus: widget.autoFocus,
        controller: widget.controller,
        focusNode: _focusNode,
        hintText: widget.hintText,
        leading: IconButton(
          onPressed: context.pop,
          icon: Icon(
            Icons.arrow_back,
            color: context.appColors.neutralShade850,
            size: context.scale(20),
          ),
          style: const ButtonStyle(
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
        ),
        onChanged: (String value) {
          final text = widget.controller.text.trim();
          final isNotEmpty = value.isNotEmpty;

          if (isNotEmpty != _isTyping) {
            setState(() {
              _isTyping = text.isNotEmpty;
            });
          }

          if (widget.onChanged != null) {
            widget.onChanged!(text);
          }
        },
        onSubmitted: widget.onSubmitted,
        trailing: [
          if (_isTyping) ...[
            IconButton(
              icon: Icon(
                Icons.clear,
                color: context.appColors.neutralShade850,
                size: context.scale(20),
              ),
              onPressed: _clearField,
            ),
          ],
        ],
      ),
    );
  }
}
