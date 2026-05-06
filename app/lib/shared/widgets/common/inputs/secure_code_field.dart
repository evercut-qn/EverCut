// lib/shared/widgets/common/inputs/secure_code_field.dart

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../extensions/context/app_colors_extension.dart';
import '../../../extensions/context/device_metrics_extension.dart';
import '../../../extensions/other/list_extension.dart';

class _SecureCodeFieldState {
  final List<String> value;
  final int currentFocusedIndex;

  const _SecureCodeFieldState({
    required this.value,
    required this.currentFocusedIndex,
  });

  factory _SecureCodeFieldState.defaultState() {
    return _SecureCodeFieldState(
      value: <String>[],
      currentFocusedIndex: -1,
    );
  }

  _SecureCodeFieldState copyWith({
    List<String>? value,
    int? currentFocusedIndex,
  }) {
    return _SecureCodeFieldState(
      value: value ?? this.value,
      currentFocusedIndex: currentFocusedIndex ?? this.currentFocusedIndex,
    );
  }
}

class SecureCodeFieldController {
  final int length;
  final ValueNotifier<_SecureCodeFieldState> _stateNotifier = ValueNotifier<_SecureCodeFieldState>(_SecureCodeFieldState.defaultState());
  final FocusNode _focusNode = FocusNode();
  final TextEditingController _controller = TextEditingController();

  SecureCodeFieldController(this.length) {
    _stateNotifier.value = _stateNotifier.value.copyWith(value: List.filled(length, ''));
    _controller.addListener(_handleInput);
  }

  String get value => _stateNotifier.value.value.join();

  void _handleInput() {
    String text = _controller.text;

    if (text.isNotEmpty) {
      final state = _stateNotifier.value;

      if (0 <= state.currentFocusedIndex && state.currentFocusedIndex < length) {
        final updatedValue = state.value;

        updatedValue.update(
          state.currentFocusedIndex,
          text.substring(text.length - 1),
        );

        _stateNotifier.value = state.copyWith(value: updatedValue);

        _moveToNext();
        _controller.clear();

        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (_stateNotifier.value.value.every((character) => character.isNotEmpty)) {
            _focusNode.unfocus();

            _stateNotifier.value = _stateNotifier.value.copyWith(
              currentFocusedIndex: -1,
            );
          }
        });
      }
    }
  }

  void _handleBackspace() {
    final state = _stateNotifier.value;

    if (state.value[state.currentFocusedIndex].isNotEmpty) {
      final updatedValue = state.value;

      updatedValue.update(state.currentFocusedIndex, '');

      _stateNotifier.value = state.copyWith(value: updatedValue);
    } else {
      int previousIndex = state.value.lastIndexWhere(
        (String character) => character.isNotEmpty,
        state.currentFocusedIndex - 1,
      );

      if (previousIndex != -1) {
        final updatedValue = state.value;

        updatedValue.update(previousIndex, '');

        _stateNotifier.value = state.copyWith(
          value: updatedValue,
          currentFocusedIndex: previousIndex,
        );
      }
    }
  }

  void _moveToNext() {
    final state = _stateNotifier.value;

    int nextIndex = state.value.indexWhere(
      (character) => character.isEmpty,
      state.currentFocusedIndex + 1,
    );

    if (nextIndex == -1) {
      nextIndex = state.value.indexWhere((character) => character.isEmpty);
    }

    _stateNotifier.value = state.copyWith(
      currentFocusedIndex: nextIndex != -1 ? nextIndex : length - 1,
    );
  }

  void _onContainerTap(int index) {
    _stateNotifier.value = _stateNotifier.value.copyWith(
      currentFocusedIndex: index,
    );

    _focusNode.requestFocus();
  }

  void _onKeyEvent(KeyEvent event) {
    if (event is KeyDownEvent) {
      if (event.logicalKey == LogicalKeyboardKey.backspace) {
        _handleBackspace();
      } else if (event.logicalKey == LogicalKeyboardKey.enter || event.logicalKey == LogicalKeyboardKey.numpadEnter) {
        _focusNode.unfocus();

        _stateNotifier.value = _stateNotifier.value.copyWith(
          currentFocusedIndex: -1,
        );
      }
    }
  }

  void dispose() {
    _focusNode.dispose();
    _controller.removeListener(_handleInput);
    _controller.dispose();
  }
}

class SecureCodeField extends StatelessWidget {
  final AutovalidateMode? autovalidateMode;
  final SecureCodeFieldController controller;
  final double fontSize;
  final bool obscureText;
  final double spacing;
  final String? Function(String?)? validator;

  const SecureCodeField({
    super.key,
    this.autovalidateMode,
    required this.controller,
    this.fontSize = 18.0,
    this.obscureText = false,
    this.spacing = 24.0,
    this.validator,
  });

  @override
  Widget build(BuildContext context) {
    return FormField<String>(
      autovalidateMode: autovalidateMode,
      initialValue: controller.value,
      validator: validator,
      builder: (FormFieldState<String> formFieldState) {
        return Column(
          children: [
            KeyboardListener(
              focusNode: FocusNode(),
              onKeyEvent: controller._onKeyEvent,
              child: Opacity(
                opacity: 0,
                child: TextField(
                  controller: controller._controller,
                  decoration: const InputDecoration(
                    constraints: BoxConstraints(
                      maxHeight: 0,
                      maxWidth: 0,
                    ),
                  ),
                  enableInteractiveSelection: false,
                  focusNode: controller._focusNode,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(1),
                  ],
                  keyboardType: TextInputType.number,
                  maxLength: 1,
                ),
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              spacing: 3.0,
              children: [
                ValueListenableBuilder<_SecureCodeFieldState>(
                  valueListenable: controller._stateNotifier,
                  builder: (BuildContext context, _SecureCodeFieldState state, Widget? child) {
                    if (formFieldState.value != controller.value) {
                      WidgetsBinding.instance.addPostFrameCallback((_) {
                        formFieldState.didChange(controller.value);
                      });
                    }

                    return GridView.builder(
                      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: controller.length,
                        crossAxisSpacing: context.scale(spacing),
                      ),
                      itemCount: controller.length,
                      itemBuilder: (BuildContext context, int index) {
                        return GestureDetector(
                          onTap: () => controller._onContainerTap(index),
                          child: Container(
                            decoration: BoxDecoration(
                              border: () {
                                if (formFieldState.hasError) {
                                  if (state.currentFocusedIndex == index) {
                                    return Border.all(
                                      color: Theme.of(context).inputDecorationTheme.errorBorder!.borderSide.color,
                                      width: Theme.of(context).inputDecorationTheme.focusedBorder!.borderSide.width,
                                    );
                                  } else {
                                    return Border.all(color: Theme.of(context).inputDecorationTheme.errorBorder!.borderSide.color);
                                  }
                                } else {
                                  if (state.currentFocusedIndex == index) {
                                    return Border.all(
                                      color: Theme.of(context).inputDecorationTheme.focusedBorder!.borderSide.color,
                                      width: Theme.of(context).inputDecorationTheme.focusedBorder!.borderSide.width,
                                    );
                                  } else {
                                    return Border.all(
                                      color: Theme.of(context).inputDecorationTheme.enabledBorder!.borderSide.color,
                                    );
                                  }
                                }
                              }(),
                              borderRadius: BorderRadius.circular(context.scale(12)),
                              color: formFieldState.hasError ? context.appColors.redShade50.withAlpha(31) : Theme.of(context).inputDecorationTheme.fillColor,
                            ),
                            child: Center(
                              child: Text(
                                obscureText && state.value[index].isNotEmpty ? '•' : state.value[index],
                                style: TextStyle(
                                  fontSize: context.scale(fontSize),
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ),
                        );
                      },
                      padding: EdgeInsets.zero,
                      physics: const NeverScrollableScrollPhysics(),
                      shrinkWrap: true,
                    );
                  },
                ),
                if (formFieldState.hasError && (formFieldState.errorText?.isNotEmpty ?? false)) ...[
                  Padding(
                    padding: const EdgeInsets.only(left: 22.0),
                    child: Text(
                      formFieldState.errorText!,
                      style: Theme.of(context).inputDecorationTheme.errorStyle?.copyWith(
                        letterSpacing: 0.4,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ],
        );
      },
    );
  }
}
