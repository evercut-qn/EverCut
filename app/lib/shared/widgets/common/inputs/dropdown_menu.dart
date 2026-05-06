// lib/shared/widgets/common/inputs/dropdown_menu.dart

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/foundation/colors/dark_color_tokens.dart';
import '../../../../core/theme/foundation/colors/light_color_tokens.dart';
import '../../../../core/theme/presentation/widgets/theme_mode_builder.dart';
import '../../../extensions/context/device_metrics_extension.dart';

class CustomDropdownMenu<T> extends StatefulWidget {
  final Offset? alignmentOffset;
  final AutovalidateMode? autovalidateMode;
  final DropdownMenuCloseBehavior closeBehavior;
  final TextEditingController? controller;
  final double? cursorHeight;
  final List<DropdownMenuEntry<T>> dropdownMenuEntries;
  final bool enabled;
  final bool enableFilter;
  final bool enableSearch;
  final EdgeInsets expandedInsets;
  final List<DropdownMenuEntry<T>> Function(List<DropdownMenuEntry<T>>, String)? filterCallback;
  final FocusNode? focusNode;
  final String? helperText;
  final String? hintText;
  final T? initialSelection;
  final Object? inputDecorationTheme;
  final List<TextInputFormatter>? inputFormatters;
  final TextInputType? keyboardType;
  final String? labelText;
  final IconData? leadingIcon;
  final int? maxLines;
  final MenuController? menuController;
  final double? menuHeight;
  final MenuStyle? menuStyle;
  final ValueSetter<T?>? onSelected;
  final int? Function(List<DropdownMenuEntry<T>>, String)? searchCallback;
  final bool showTrailingIcon;
  final TextAlign textAlign;
  final TextInputAction? textInputAction;
  final TextStyle? textStyle;
  final FocusNode? trailingIconFocusNode;
  final bool? requestFocusOnTap;
  final String? restorationId;
  final String? Function(T?)? validator;
  final double? width;

  const CustomDropdownMenu({
    super.key,
    this.alignmentOffset,
    this.autovalidateMode,
    this.closeBehavior = DropdownMenuCloseBehavior.all,
    this.controller,
    this.cursorHeight,
    required this.dropdownMenuEntries,
    this.enabled = true,
    this.enableFilter = false,
    this.enableSearch = true,
    this.expandedInsets = EdgeInsets.zero,
    this.filterCallback,
    this.focusNode,
    this.helperText,
    this.hintText,
    this.initialSelection,
    this.inputDecorationTheme,
    this.inputFormatters,
    this.keyboardType,
    this.labelText,
    this.leadingIcon,
    this.maxLines = 1,
    this.menuController,
    this.menuHeight,
    this.menuStyle,
    this.onSelected,
    this.searchCallback,
    this.showTrailingIcon = true,
    this.textAlign = TextAlign.start,
    this.textInputAction,
    this.textStyle,
    this.trailingIconFocusNode,
    this.requestFocusOnTap,
    this.restorationId,
    this.validator,
    this.width,
  });

  @override
  State<CustomDropdownMenu<T>> createState() => _CustomDropdownMenuState<T>();
}

class _CustomDropdownMenuState<T> extends State<CustomDropdownMenu<T>> {
  Padding? get _leadingIcon {
    if (widget.leadingIcon != null) {
      return Padding(
        padding: EdgeInsets.only(left: context.scale(6)),
        child: Icon(
          widget.leadingIcon,
          size: context.scale(20),
        ),
      );
    } else {
      return null;
    }
  }

  Text? get _labelText {
    if (widget.labelText != null) {
      return Text(
        widget.labelText!,
        style: TextStyle(
          fontSize: context.scale(14),
        ),
      );
    } else {
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: Theme.of(context).copyWith(
        iconButtonTheme: IconButtonThemeData(
          style: Theme.of(context).iconButtonTheme.style?.copyWith(
            overlayColor: WidgetStateColor.transparent,
            splashFactory: NoSplash.splashFactory,
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            visualDensity: VisualDensity.compact,
          ),
        ),
      ),
      child: FormField<T>(
        autovalidateMode: widget.autovalidateMode,
        validator: widget.validator,
        builder: (FormFieldState<T> state) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            spacing: context.scale(3),
            children: [
              DropdownMenu<T>(
                alignmentOffset: widget.alignmentOffset,
                closeBehavior: widget.closeBehavior,
                controller: widget.controller,
                cursorHeight: widget.cursorHeight,
                dropdownMenuEntries: widget.dropdownMenuEntries,
                enabled: widget.enabled,
                enableFilter: widget.enableFilter,
                enableSearch: widget.enableSearch,
                errorText: state.errorText,
                expandedInsets: widget.expandedInsets,
                filterCallback: widget.filterCallback,
                focusNode: widget.focusNode,
                helperText: widget.helperText,
                hintText: widget.hintText,
                initialSelection: widget.initialSelection,
                inputDecorationTheme: widget.inputDecorationTheme,
                inputFormatters: widget.inputFormatters,
                keyboardType: widget.keyboardType,
                label: _labelText,
                leadingIcon: _leadingIcon,
                maxLines: widget.maxLines,
                menuController: widget.menuController,
                menuHeight: widget.menuHeight,
                menuStyle: widget.menuStyle,
                onSelected: (T? value) {
                  widget.onSelected?.call(value);
                  state.didChange(value);
                },
                searchCallback: widget.searchCallback,
                selectedTrailingIcon: Padding(
                  padding: EdgeInsets.only(left: context.scale(6), right: context.scale(6)),
                  child: ThemeModeBuilder(
                    builder: (BuildContext context, bool isDarkMode) {
                      return Icon(
                        Icons.keyboard_arrow_up,
                        color: isDarkMode ? DarkColorTokens.neutralShade800 : LightColorTokens.neutralShade400,
                        size: context.scale(20),
                      );
                    },
                  ),
                ),
                showTrailingIcon: widget.showTrailingIcon,
                textAlign: widget.textAlign,
                textInputAction: widget.textInputAction,
                textStyle: TextStyle(fontSize: context.scale(14)),
                trailingIcon: Padding(
                  padding: EdgeInsets.only(left: context.scale(6), right: context.scale(6)),
                  child: ThemeModeBuilder(
                    builder: (BuildContext context, bool isDarkMode) {
                      return Icon(
                        Icons.keyboard_arrow_down,
                        color: isDarkMode ? DarkColorTokens.neutralShade800 : LightColorTokens.neutralShade400,
                        size: context.scale(20),
                      );
                    },
                  ),
                ),
                trailingIconFocusNode: widget.trailingIconFocusNode,
                requestFocusOnTap: widget.requestFocusOnTap,
                restorationId: widget.restorationId,
                width: widget.width,
              ),
            ],
          );
        },
      ),
    );
  }
}
