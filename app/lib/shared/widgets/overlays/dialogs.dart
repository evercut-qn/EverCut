// lib/shared/widgets/overlays/dialogs.dart

import 'dart:async';

import 'package:equatable/equatable.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_markdown_plus/flutter_markdown_plus.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/injection.dart' as di;
import '../../../core/navigation/transitions/transitions.dart';
import '../../extensions/context/app_colors_extension.dart';
import '../../extensions/context/device_metrics_extension.dart';

class Dialogs {
  final BuildContext context;

  const Dialogs._(this.context);

  factory Dialogs.of(BuildContext context) {
    return Dialogs._(context);
  }

  void showCustomDialog({
    Alignment alignment = Alignment.bottomCenter,
    Offset? anchorPoint,
    bool barrierDismissible = true,
    Color? barrierColor,
    String? barrierLabel,
    String? content,
    Widget? child,
    bool expandButtons = false,
    required String title,
    VoidCallback? onPrimaryButtonClick,
    VoidCallback? onSecondaryButtonClick,
    EdgeInsets? padding,
    String? primaryButtonText,
    RouteSettings? routeSettings,
    String? secondaryButtonText,
    Transitions transition = Transitions.slideBottom,
    Duration transitionDuration = const Duration(milliseconds: 300),
    bool useRootNavigator = true,
  }) {
    assert((content != null) != (child != null), 'Either content or child must be provided, but not both.');

    showGeneralDialog(
      anchorPoint: anchorPoint,
      barrierColor: barrierColor ?? Colors.black.withAlpha(63),
      barrierDismissible: barrierDismissible,
      barrierLabel: barrierLabel ?? '',
      context: context,
      routeSettings: routeSettings,
      transitionBuilder: transition.buildTransition,
      transitionDuration: transitionDuration,
      useRootNavigator: useRootNavigator,
      pageBuilder: (BuildContext context, Animation<double> animation, Animation<double> secondaryAnimation) {
        return SafeArea(
          child: Dialog(
            alignment: alignment,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        decoration: BoxDecoration(
                          color: context.appColors.secondaryDividerColor,
                          borderRadius: BorderRadius.vertical(
                            top: Radius.circular(context.scale(12)),
                          ),
                        ),
                        padding: EdgeInsets.all(context.scale(20)),
                        child: Text(
                          title,
                          style: TextStyle(
                            height: 1,
                            fontSize: context.scale(16),
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                if (content != null) ...[
                  ConstrainedBox(
                    constraints: BoxConstraints(
                      maxHeight: context.safeAreaViewportSize.height * 0.75,
                    ),
                    child: Markdown(
                      data: content,
                      padding: padding ?? EdgeInsets.all(context.scale(20)),
                      physics: const ClampingScrollPhysics(),
                      shrinkWrap: true,
                      styleSheet: MarkdownStyleSheet(
                        p: TextStyle(
                          color: context.appColors.neutralShade750,
                          fontSize: context.scale(14),
                        ),
                      ),
                    ),
                  ),
                ] else ...[
                  ConstrainedBox(
                    constraints: BoxConstraints(
                      maxHeight: context.scale(600),
                    ),
                    child: Padding(
                      padding: padding ?? EdgeInsets.all(context.scale(20)),
                      child: child,
                    ),
                  ),
                ],
                if (secondaryButtonText != null || primaryButtonText != null) ...[
                  Divider(
                    color: context.appColors.secondaryDividerColor,
                    height: 1.0,
                  ),
                ],
                if (secondaryButtonText != null || primaryButtonText != null) ...[
                  Padding(
                    padding: EdgeInsets.all(context.scale(20)),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      spacing: context.scale(12),
                      children: [
                        if (secondaryButtonText != null) ...[
                          Expanded(
                            flex: expandButtons ? 1 : 0,
                            child: OutlinedButton(
                              onPressed: onSecondaryButtonClick,
                              style: ButtonStyle(
                                padding: WidgetStatePropertyAll(
                                  EdgeInsets.symmetric(
                                    vertical: context.scale(12),
                                    horizontal: context.scale(16),
                                  ),
                                ),
                              ),
                              child: Text(
                                secondaryButtonText,
                                style: TextStyle(
                                  fontSize: context.scale(14),
                                ),
                              ),
                            ),
                          ),
                        ],
                        if (primaryButtonText != null) ...[
                          Expanded(
                            flex: expandButtons ? 1 : 0,
                            child: FilledButton(
                              onPressed: onPrimaryButtonClick,
                              style: ButtonStyle(
                                padding: WidgetStatePropertyAll(
                                  EdgeInsets.symmetric(
                                    vertical: context.scale(12),
                                    horizontal: context.scale(16),
                                  ),
                                ),
                              ),
                              child: Text(
                                primaryButtonText,
                                style: TextStyle(
                                  fontSize: context.scale(14),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  void showConfirmationDialog({
    required String title,
    required String description,
    String? confirmButtonText,
    VoidCallback? onCancelButtonClick,
    required VoidCallback onConfirmButtonClick,
  }) {
    showCustomDialog(
      title: title,
      content: description,
      barrierLabel: 'Close Confirmation Dialog',
      primaryButtonText: confirmButtonText ?? 'Confirm',
      secondaryButtonText: 'Cancel',
      onPrimaryButtonClick: onConfirmButtonClick,
      onSecondaryButtonClick: onCancelButtonClick ?? closeDialog,
    );
  }

  void showInformationalDialog({
    required String title,
    required String message,
    String? buttonText,
    VoidCallback? onButtonClick,
  }) {
    showCustomDialog(
      title: title,
      content: message,
      barrierLabel: 'Close Information Dialog',
      alignment: Alignment.center,
      transition: Transitions.fade,
      transitionDuration: const Duration(milliseconds: 50),
      primaryButtonText: buttonText ?? 'Close',
      onPrimaryButtonClick: onButtonClick ?? closeDialog,
    );
  }

  void showInputDialog({
    required String title,
    String? confirmButtonText,
    VoidCallback? onCancelButtonClick,
    required VoidCallback onConfirmButtonClick,
    AutovalidateMode? autovalidateMode,
    required TextEditingController controller,
    required GlobalKey formKey,
    List<TextInputFormatter>? inputFormatters,
    String? Function(String?)? validator,
  }) {
    showCustomDialog(
      alignment: Alignment.center,
      barrierLabel: 'Close Input Dialog',
      primaryButtonText: confirmButtonText ?? 'Confirm',
      secondaryButtonText: 'Cancel',
      onPrimaryButtonClick: onConfirmButtonClick,
      onSecondaryButtonClick: onCancelButtonClick ?? closeDialog,
      title: title,
      transition: Transitions.scaleFade,
      transitionDuration: const Duration(milliseconds: 50),
      child: Form(
        key: formKey,
        child: TextFormField(
          autovalidateMode: autovalidateMode,
          controller: controller,
          decoration: InputDecoration(
            errorMaxLines: 3,
            filled: false,
          ),
          inputFormatters: inputFormatters,
          validator: validator,
          style: TextStyle(fontSize: context.scale(14)),
        ),
      ),
    );
  }

  void showLoadingDialog({
    String? initialTitle,
    String? initialDescription,
    required String instanceName,
    RouteSettings? routeSettings,
  }) {
    LoadingDialogCubit? cubit;

    if ((initialTitle != null && initialTitle.isNotEmpty) && (initialDescription != null && initialDescription.isNotEmpty)) {
      if (di.sl.isRegistered<LoadingDialogCubit>(instanceName: instanceName)) {
        throw Exception("A LoadingDialogCubit with instance name '$instanceName' is already registered.");
      }

      di.sl.registerLazySingleton<LoadingDialogCubit>(
        () => LoadingDialogCubit(
          initialTitle: initialTitle,
          initialDescription: initialDescription,
        ),
        instanceName: instanceName,
      );

      cubit = di.sl<LoadingDialogCubit>(
        instanceName: instanceName,
      );
    }

    showDialog(
      barrierColor: Colors.transparent,
      barrierDismissible: false,
      barrierLabel: 'Close Loading Dialog',
      context: context,
      routeSettings: routeSettings,
      useSafeArea: false,
      builder: (BuildContext context) {
        return PopScope(
          canPop: false,
          child: Dialog.fullscreen(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              mainAxisAlignment: MainAxisAlignment.center,
              spacing: context.scale(32),
              children: [
                CircularProgressIndicator(strokeWidth: context.scale(4)),
                if (cubit != null) ...[
                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: context.scale(48)),
                    child: BlocProvider.value(
                      value: cubit,
                      child: Column(
                        spacing: context.scale(8),
                        children: [
                          BlocSelector<LoadingDialogCubit, LoadingDialogState, String>(
                            selector: (LoadingDialogState state) => state.title,
                            builder: (BuildContext context, String title) {
                              if (title.isNotEmpty) {
                                return Text(
                                  title,
                                  textAlign: TextAlign.center,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontSize: context.scale(16),
                                    fontWeight: FontWeight.w700,
                                  ),
                                );
                              } else {
                                return const SizedBox.shrink();
                              }
                            },
                          ),
                          BlocSelector<LoadingDialogCubit, LoadingDialogState, String>(
                            selector: (LoadingDialogState state) => state.description,
                            builder: (BuildContext context, String description) {
                              if (description.isNotEmpty) {
                                return Text(
                                  description,
                                  maxLines: 3,
                                  overflow: TextOverflow.ellipsis,
                                  textAlign: TextAlign.center,
                                );
                              } else {
                                return const SizedBox.shrink();
                              }
                            },
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    ).whenComplete(() {
      if (di.sl.isRegistered<LoadingDialogCubit>(instanceName: instanceName)) {
        di.sl.unregister<LoadingDialogCubit>(instanceName: instanceName);
      }
    });
  }

  Future<T?> showFullscreenDialog<T>({
    bool barrierDismissible = true,
    String? barrierLabel,
    bool canPop = true,
    required Widget child,
    VoidCallback? onClose,
    RouteSettings? routeSettings,
    Transitions transition = Transitions.fade,
    Duration transitionDuration = const Duration(milliseconds: 300),
    bool useRootNavigator = true,
  }) async {
    return showGeneralDialog<T>(
      barrierColor: Colors.transparent,
      barrierDismissible: barrierDismissible,
      barrierLabel: barrierLabel ?? '',
      context: context,
      routeSettings: routeSettings,
      transitionBuilder: transition.buildTransition,
      transitionDuration: transitionDuration,
      useRootNavigator: useRootNavigator,
      pageBuilder: (BuildContext context, Animation<double> animation, Animation<double> secondaryAnimation) {
        return PopScope(
          canPop: canPop,
          child: Dialog.fullscreen(
            child: child,
          ),
        );
      },
    ).whenComplete(() {
      if (onClose != null) {
        onClose();
      }
    });
  }

  void closeDialog() {
    if (context.canPop()) {
      context.pop();
    }
  }
}

class LoadingDialogState extends Equatable {
  final String title;
  final String description;

  const LoadingDialogState({
    required this.title,
    required this.description,
  });

  LoadingDialogState copyWith({
    String? title,
    String? description,
  }) {
    return LoadingDialogState(
      title: title ?? this.title,
      description: description ?? this.description,
    );
  }

  @override
  List<Object?> get props => [
    title,
    description,
  ];
}

class LoadingDialogCubit extends Cubit<LoadingDialogState> {
  LoadingDialogCubit({
    String initialTitle = '',
    String initialDescription = '',
  }) : super(LoadingDialogState(title: initialTitle, description: initialDescription));

  void update({
    String? title,
    String? description,
  }) {
    emit(
      state.copyWith(
        title: title ?? state.title,
        description: description ?? state.description,
      ),
    );
  }
}
