// lib/features/appointments/presentation/views/appointments_list/appointments_list_screen.dart

import 'package:flutter/material.dart';

import '../../../../../shared/enums/appointment_status.dart';
import '../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../widgets/appointment.dart';

class AppointmentsListScreen extends StatelessWidget {
  final AppointmentStatusEnum status;

  const AppointmentsListScreen(
    this.status, {
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('${status.label} Appointments')),
      backgroundColor: context.appColors.backgroundShade75,
      body: SafeArea(
        child: ListView.separated(
          itemBuilder: (BuildContext context, int index) {
            return AppointmentWidget();
          },
          itemCount: 15,
          padding: EdgeInsets.all(context.scale(24)),
          separatorBuilder: (BuildContext context, int index) {
            return SizedBox(
              height: context.scale(16),
            );
          },
        ),
      ),
    );
  }
}
