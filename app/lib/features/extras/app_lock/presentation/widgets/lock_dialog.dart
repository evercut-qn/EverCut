// lib/features/extras/app_lock/presentation/widgets/lock_dialog.dart

import 'package:flutter/material.dart';

import '../../../../../core/theme/foundation/app_icons.dart';
import '../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../shared/extensions/context/device_metrics_extension.dart';

part '../models/keycap.dart';

class LockDialog extends StatefulWidget {
  const LockDialog({super.key});

  @override
  State<LockDialog> createState() => _LockDialogState();
}

class _LockDialogState extends State<LockDialog> {
  final Set<KeyCap> _keyCaps = const <KeyCap>{
    KeyCap(value: 1, text: ''),
    KeyCap(value: 2, text: 'ABC'),
    KeyCap(value: 3, text: 'DEF'),
    KeyCap(value: 4, text: 'GHI'),
    KeyCap(value: 5, text: 'JKL'),
    KeyCap(value: 6, text: 'MNO'),
    KeyCap(value: 7, text: 'PQRS'),
    KeyCap(value: 8, text: 'TUV'),
    KeyCap(value: 9, text: 'WXYZ'),
    KeyCap(value: 10, text: ''),
    KeyCap(value: 0, text: '+'),
    KeyCap(value: 11, text: ''),
  };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: EdgeInsets.all(context.scale(72)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            spacing: context.scale(72),
            children: [
              Center(
                child: Icon(
                  Icons.lock,
                  color: context.appColors.neutralShade850,
                  size: context.scale(36),
                ),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  mainAxisAlignment: MainAxisAlignment.end,
                  spacing: context.scale(48),
                  children: [
                    Text(
                      'Enter Security PIN',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: context.appColors.neutralShade850,
                        fontSize: context.scale(14),
                      ),
                    ),
                    Flexible(
                      child: GridView.builder(
                        clipBehavior: Clip.hardEdge,
                        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 3,
                          crossAxisSpacing: context.scale(24),
                          mainAxisSpacing: context.scale(24),
                        ),
                        itemBuilder: (BuildContext context, int index) {
                          if (index == 9) {
                            return Material(
                              clipBehavior: Clip.hardEdge,
                              color: Colors.transparent,
                              shape: const CircleBorder(),
                              child: InkWell(
                                highlightColor: context.appColors.backgroundShade100,
                                onTap: () {},
                                splashColor: context.appColors.backgroundShade150,
                                child: Padding(
                                  padding: EdgeInsets.all(context.scale(8)),
                                  child: Center(
                                    child: Icon(
                                      Icons.backspace_rounded,
                                      color: context.appColors.neutralShade850,
                                      size: context.scale(24),
                                    ),
                                  ),
                                ),
                              ),
                            );
                          } else if (index == 11) {
                            return Material(
                              clipBehavior: Clip.hardEdge,
                              color: Colors.transparent,
                              shape: const CircleBorder(),
                              child: InkWell(
                                highlightColor: context.appColors.backgroundShade100,
                                onTap: () {},
                                splashColor: context.appColors.backgroundShade150,
                                child: Padding(
                                  padding: EdgeInsets.all(context.scale(8)),
                                  child: Center(
                                    child: Icon(
                                      AppIcons.solidRoundedFingerAccess,
                                      color: context.appColors.neutralShade850,
                                      size: context.scale(32),
                                    ),
                                  ),
                                ),
                              ),
                            );
                          } else {
                            final keyCap = _keyCaps.elementAt(index);
                            return Material(
                              clipBehavior: Clip.hardEdge,
                              color: context.appColors.backgroundShade75,
                              shape: const CircleBorder(),
                              child: InkWell(
                                highlightColor: context.appColors.backgroundShade100,
                                onTap: () {},
                                splashColor: context.appColors.backgroundShade150,
                                child: Padding(
                                  padding: EdgeInsets.all(context.scale(8)),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.stretch,
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    spacing: context.scale(2),
                                    children: [
                                      Text(
                                        '${keyCap.value}',
                                        textAlign: TextAlign.center,
                                        style: TextStyle(
                                          color: context.appColors.neutralShade850,
                                          fontSize: context.scale(18),
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                      Text(
                                        keyCap.text,
                                        textAlign: TextAlign.center,
                                        style: TextStyle(
                                          color: context.appColors.neutralShade650,
                                          fontSize: context.scale(10),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            );
                          }
                        },
                        itemCount: 12,
                        padding: EdgeInsets.zero,
                        physics: const NeverScrollableScrollPhysics(),
                        shrinkWrap: true,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
