// lib/shared/widgets/common/inputs/text_form_field.dart

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/foundation/app_icons.dart';
import '../../../extensions/context/device_metrics_extension.dart';

class CustomTextFormField extends StatefulWidget {
  final Iterable<String>? autofillHints;
  final AutovalidateMode? autovalidateMode;
  final bool canRequestFocus;
  final TextEditingController? controller;
  final bool? enabled;
  final int errorMaxLines;
  final bool? filled;
  final FocusNode? focusNode;
  final String? fontFamily;
  final String? hintText;
  final List<TextInputFormatter>? inputFormatters;
  final bool? isPasswordField;
  final String? initialValue;
  final TextInputType? keyboardType;
  final String? labelText;
  final bool? obscureText;
  final String? obscuringCharacter;
  final VoidCallback? onSuffixIconPressed;
  final VoidCallback? onTap;
  final IconData? prefixIcon;
  final bool? readOnly;
  final IconData? suffixIcon;
  final Widget? suffixWidget;
  final TextCapitalization textCapitalization;
  final TextAlign textAlign;
  final String? Function(String?)? validator;

  const CustomTextFormField({
    super.key,
    this.autofillHints,
    this.autovalidateMode,
    this.canRequestFocus = true,
    this.controller,
    this.enabled,
    this.errorMaxLines = 1,
    this.filled,
    this.focusNode,
    this.fontFamily,
    this.hintText,
    this.inputFormatters,
    this.isPasswordField,
    this.initialValue,
    this.keyboardType,
    this.labelText,
    this.obscureText,
    this.obscuringCharacter,
    this.onSuffixIconPressed,
    this.onTap,
    this.prefixIcon,
    this.readOnly,
    this.suffixIcon,
    this.suffixWidget,
    this.textCapitalization = TextCapitalization.none,
    this.textAlign = TextAlign.start,
    this.validator,
  });

  @override
  State<CustomTextFormField> createState() => _CustomTextFormFieldState();
}

class _CustomTextFormFieldState extends State<CustomTextFormField> {
  bool _obscureText = false;

  @override
  void initState() {
    super.initState();
    _obscureText = widget.obscureText ?? _obscureText;
  }

  Padding? get _prefixIcon {
    if (widget.prefixIcon != null) {
      return Padding(
        padding: EdgeInsets.only(left: context.scale(6)),
        child: Icon(widget.prefixIcon, size: context.scale(20)),
      );
    } else {
      return null;
    }
  }

  Widget? get _suffixIcon {
    if (widget.suffixWidget != null) {
      return widget.suffixWidget;
    } else {
      if (widget.suffixIcon != null && widget.isPasswordField == null) {
        return InkWell(
          onTap: widget.onSuffixIconPressed,
          splashFactory: NoSplash.splashFactory,
          child: Padding(
            padding: EdgeInsets.only(right: context.scale(6)),
            child: Icon(widget.suffixIcon, size: context.scale(20)),
          ),
        );
      } else if (widget.isPasswordField ?? false) {
        return InkWell(
          onTap: () => setState(() {
            _obscureText = !_obscureText;
          }),
          splashFactory: NoSplash.splashFactory,
          child: Padding(
            padding: EdgeInsets.only(right: context.scale(6)),
            child: Icon(
              _obscureText ? AppIcons.solidRoundedViewOff : AppIcons.solidRoundedView,
              size: context.scale(20),
            ),
          ),
        );
      } else {
        return null;
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      autovalidateMode: widget.autovalidateMode,
      autofillHints: widget.autofillHints,
      canRequestFocus: widget.canRequestFocus,
      controller: widget.controller,
      decoration: InputDecoration(
        filled: widget.filled,
        hintText: widget.hintText,
        labelText: widget.labelText,
        prefixIcon: _prefixIcon,
        suffixIcon: _suffixIcon,
        errorMaxLines: widget.errorMaxLines,
      ),
      enabled: widget.enabled,
      focusNode: widget.focusNode,
      inputFormatters: widget.inputFormatters,
      initialValue: widget.initialValue,
      keyboardType: widget.keyboardType,
      textAlign: widget.textAlign,
      obscureText: _obscureText,
      obscuringCharacter: widget.obscuringCharacter ?? '•',
      onTap: widget.onTap,
      readOnly: widget.readOnly ?? false,
      style: TextStyle(fontSize: context.scale(14), fontFamily: widget.fontFamily),
      textCapitalization: widget.textCapitalization,
      validator: widget.validator,
    );
  }
}
