// lib/features/image_gallery/presentation/views/image_gallery_screen.dart

import 'package:flutter/material.dart';

import '../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../shared/extensions/context/device_metrics_extension.dart';
import '../../../../shared/widgets/common/inputs/text_form_field.dart';
import '../../../../shared/widgets/overlays/bottomsheet.dart';
import '../widgets/carousel_slider.dart';
import '../widgets/image_preview_dialog.dart';

class ImageGalleryScreen extends StatefulWidget {
  const ImageGalleryScreen({super.key});

  @override
  State<ImageGalleryScreen> createState() => _ImageGalleryScreenState();
}

class _ImageGalleryScreenState extends State<ImageGalleryScreen> with SingleTickerProviderStateMixin {
  bool _isScrolling = false;
  final ScrollController _scrollController = ScrollController();
  late final AnimationController _heightAnimationController;

  @override
  void initState() {
    super.initState();
    _heightAnimationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
      value: 1.0,
    );
    _scrollController.addListener(_scrollControllerListener);
  }

  void _scrollControllerListener() {
    final shouldBeScrolling = _scrollController.offset > 125.0;
    if (shouldBeScrolling != _isScrolling) {
      setState(() {
        _isScrolling = shouldBeScrolling;
      });

      if (shouldBeScrolling) {
        _heightAnimationController.reverse();
      } else {
        _heightAnimationController.forward();
      }
    }
  }

  @override
  void dispose() {
    _scrollController.removeListener(_scrollControllerListener);
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: () {
        if (_isScrolling) {
          return AppBar(
            title: const Text(
              'Image Gallery',
            ),
          );
        }
      }(),
      body: SafeArea(
        top: false,
        child: Column(
          children: [
            SizeTransition(
              sizeFactor: CurvedAnimation(
                parent: _heightAnimationController,
                curve: Curves.easeInOut,
              ),
              axis: Axis.vertical,
              axisAlignment: -1.0,
              child: const CustomCarouselSlider(),
            ),
            Expanded(
              child: GridView.builder(
                controller: _scrollController,
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  childAspectRatio: 0.71,
                  crossAxisCount: 3,
                  crossAxisSpacing: context.scale(12),
                  mainAxisSpacing: context.scale(12),
                ),
                itemBuilder: (BuildContext context, int index) {
                  return GestureDetector(
                    onTap: () => showDialog(
                      barrierColor: Colors.black.withAlpha(127),
                      barrierDismissible: true,
                      barrierLabel: 'ImagePreviewDialog',
                      builder: (BuildContext context) => const ImagePreviewDialog(),
                      context: context,
                      fullscreenDialog: true,
                      useSafeArea: false,
                    ),
                    child: ColoredBox(color: Colors.grey),
                  );
                },
                itemCount: 30,
                padding: EdgeInsets.symmetric(
                  vertical: context.scale(12),
                ),
                physics: const ClampingScrollPhysics(),
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => showCustomBottomsheet(
          context: context,
          builder: (context) => const SimpleBottomsheet(),
        ),
        child: Icon(
          Icons.add,
        ),
      ),
    );
  }
}

class SimpleBottomsheet extends StatelessWidget {
  const SimpleBottomsheet({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Lorem Ipsum',
          style: TextStyle(
            fontSize: context.scale(16),
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          'Lorem Ipsum is simply dummy text of the printing and typesetting industry.',
          style: TextStyle(
            fontSize: context.scale(12),
          ),
        ),
        SizedBox(height: context.scale(12)),
        CustomTextFormField(
          labelText: 'Enter Value',
        ),
        SizedBox(height: context.scale(12)),
        Divider(color: context.appColors.secondaryDividerColor),
        SizedBox(height: context.scale(12)),
        Row(
          spacing: context.scale(12),
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: () {},
                child: Text('First'),
              ),
            ),
            Expanded(
              child: FilledButton(
                onPressed: () {},
                child: Text('Second'),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
