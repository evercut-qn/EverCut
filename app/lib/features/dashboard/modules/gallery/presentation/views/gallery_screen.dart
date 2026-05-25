// lib/features/dashboard/modules/gallery/presentation/views/gallery_screen.dart

import 'package:flutter/material.dart';

import '../../../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../widgets/preview_dialog.dart';

class GalleryScreen extends StatefulWidget {
  const GalleryScreen({super.key});

  @override
  State<GalleryScreen> createState() => _GalleryScreenState();
}

class _GalleryScreenState extends State<GalleryScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Gallery')),
      backgroundColor: context.appColors.backgroundShade75,
      body: SafeArea(
        child: GridView.builder(
          clipBehavior: Clip.hardEdge,
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            childAspectRatio: 0.67,
            crossAxisCount: 3,
            crossAxisSpacing: context.scale(16),
            mainAxisSpacing: context.scale(16),
          ),
          itemBuilder: (BuildContext context, int index) {
            return GestureDetector(
              onTap: () => showDialog(
                barrierColor: Colors.black.withAlpha(127),
                barrierDismissible: true,
                barrierLabel: 'PreviewDialog',
                builder: (BuildContext context) => const PreviewDialogWidget(),
                context: context,
                fullscreenDialog: true,
                useSafeArea: false,
              ),
              child: Material(
                clipBehavior: Clip.hardEdge,
                color: context.appColors.backgroundShade50,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(context.scale(8)),
                  side: BorderSide(color: context.appColors.backgroundShade200),
                ),
              ),
            );
          },
          itemCount: 15,
          padding: EdgeInsets.all(context.scale(16)),
          physics: const ClampingScrollPhysics(),
          shrinkWrap: true,
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {},
        child: const Icon(Icons.add),
      ),
    );
  }
}
