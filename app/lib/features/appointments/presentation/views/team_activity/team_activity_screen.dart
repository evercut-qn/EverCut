// lib/features/appointments/presentation/views/team_activity/team_activity_screen.dart

import 'package:flutter/material.dart';

import '../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../widgets/employee.dart';

class TeamActivityScreen extends StatelessWidget {
  const TeamActivityScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Staff Availability')),
      backgroundColor: context.appColors.backgroundShade75,
      body: SafeArea(
        child: SingleChildScrollView(
          clipBehavior: Clip.hardEdge,
          child: ListView.separated(
            itemBuilder: (BuildContext context, int index) {
              return EmployeeWidget();
            },
            itemCount: 7,
            padding: EdgeInsets.all(context.scale(24)),
            physics: const NeverScrollableScrollPhysics(),
            separatorBuilder: (BuildContext context, int index) {
              return SizedBox(
                height: context.scale(16),
              );
            },
            shrinkWrap: true,
          ),
        ),
      ),
    );
  }
}
