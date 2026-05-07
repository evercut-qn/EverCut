// lib/features/extras/app_lock/presentation/views/app_lock_screen.dart

import 'package:flutter/material.dart';

import '../../../../../core/theme/foundation/app_icons.dart';
import '../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../shared/extensions/context/device_metrics_extension.dart';

class AppLockScreen extends StatelessWidget {
  const AppLockScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('App Lock')),
      backgroundColor: context.appColors.backgroundShade75,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.all(context.scale(24)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Material(
                clipBehavior: Clip.hardEdge,
                color: context.appColors.backgroundShade50,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(context.scale(16)),
                  side: BorderSide(color: context.appColors.backgroundShade200),
                ),
                child: Padding(
                  padding: EdgeInsets.all(context.scale(20)),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    spacing: context.scale(20),
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        spacing: context.scale(16),
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            spacing: context.scale(16),
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.stretch,
                                  spacing: context.scale(4),
                                  children: [
                                    Row(
                                      spacing: context.scale(16),
                                      children: [
                                        SizedBox.square(
                                          dimension: context.scale(24),
                                          child: Icon(
                                            AppIcons.solidRoundedFingerAccess,
                                            color: context.appColors.neutralShade850,
                                            size: context.scale(24),
                                          ),
                                        ),
                                        Expanded(
                                          child: Text(
                                            'Unlock With Biometric',
                                            style: TextStyle(
                                              color: context.appColors.neutralShade850,
                                              fontSize: context.scale(14),
                                              fontWeight: FontWeight.w600,
                                              height: 1.45,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    Padding(
                                      padding: EdgeInsets.only(left: context.scale(40)),
                                      child: Text(
                                        'Access the app using FaceID or fingerprint for a faster, secure experience while keeping your data protected.',
                                        style: TextStyle(
                                          color: context.appColors.neutralShade650,
                                          fontSize: context.scale(12),
                                          height: 1.45,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              SizedBox(
                                width: context.scale(40),
                                height: context.scale(30),
                                child: FittedBox(
                                  fit: BoxFit.fill,
                                  child: Switch(
                                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                    onChanged: (value) {},
                                    padding: EdgeInsets.zero,
                                    value: false,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          Padding(
                            padding: EdgeInsets.only(left: context.scale(40)),
                            child: Material(
                              clipBehavior: Clip.hardEdge,
                              color: context.appColors.backgroundShade75,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(context.scale(12)),
                                side: BorderSide(color: context.appColors.backgroundShade200),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  Padding(
                                    padding: EdgeInsets.symmetric(
                                      horizontal: context.scale(16),
                                      vertical: context.scale(14),
                                    ),
                                    child: Text(
                                      'Automatic Lock',
                                      style: TextStyle(
                                        color: context.appColors.neutralShade650,
                                        fontSize: context.scale(12),
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ),
                                  Divider(
                                    color: context.appColors.backgroundShade200,
                                    height: 1.0,
                                  ),
                                  Padding(
                                    padding: EdgeInsets.all(context.scale(12)),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.stretch,
                                      spacing: context.scale(6),
                                      children: [
                                        Row(
                                          spacing: context.scale(6),
                                          children: [
                                            Radio(
                                              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                              value: false,
                                              visualDensity: VisualDensity.compact,
                                            ),
                                            Expanded(
                                              child: Text(
                                                'Immediately',
                                                style: TextStyle(
                                                  color: context.appColors.neutralShade650,
                                                  fontSize: context.scale(12),
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                        Row(
                                          spacing: context.scale(6),
                                          children: [
                                            Radio(
                                              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                              value: false,
                                              visualDensity: VisualDensity.compact,
                                            ),
                                            Expanded(
                                              child: Text(
                                                'After 1 Minute',
                                                style: TextStyle(
                                                  color: context.appColors.neutralShade650,
                                                  fontSize: context.scale(12),
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                        Row(
                                          spacing: context.scale(6),
                                          children: [
                                            Radio(
                                              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                              value: false,
                                              visualDensity: VisualDensity.compact,
                                            ),
                                            Expanded(
                                              child: Text(
                                                'After 15 Minute',
                                                style: TextStyle(
                                                  color: context.appColors.neutralShade650,
                                                  fontSize: context.scale(12),
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                      Divider(
                        color: context.appColors.backgroundShade200,
                        height: 1.0,
                        indent: context.scale(40),
                      ),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        spacing: context.scale(16),
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              spacing: context.scale(4),
                              children: [
                                Row(
                                  spacing: context.scale(16),
                                  children: [
                                    SizedBox.square(
                                      dimension: context.scale(24),
                                      child: Icon(
                                        Icons.notifications_active,
                                        color: context.appColors.neutralShade850,
                                        size: context.scale(24),
                                      ),
                                    ),
                                    Expanded(
                                      child: Text(
                                        'Notification Privacy',
                                        style: TextStyle(
                                          color: context.appColors.neutralShade850,
                                          fontSize: context.scale(14),
                                          fontWeight: FontWeight.w600,
                                          height: 1.45,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                Padding(
                                  padding: EdgeInsets.only(left: context.scale(40)),
                                  child: Text(
                                    'Hide notification content while the app is locked to protect your privacy.',
                                    style: TextStyle(
                                      color: context.appColors.neutralShade650,
                                      fontSize: context.scale(12),
                                      height: 1.45,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          SizedBox(
                            width: context.scale(40),
                            height: context.scale(30),
                            child: FittedBox(
                              fit: BoxFit.fill,
                              child: Switch(
                                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                onChanged: (value) {},
                                padding: EdgeInsets.zero,
                                value: false,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
