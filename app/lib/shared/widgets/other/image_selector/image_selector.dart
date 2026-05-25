// lib/shared/widgets/other/image_selector/image_selector.dart

import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../../overlays/snackbars.dart';

typedef ImageSelectorBuilder = Widget Function(BuildContext context, XFile? selectedImage, VoidCallback onSelect, VoidCallback onRemove);

class ImageSelector extends StatefulWidget {
  final ImageSelectorBuilder builder;
  final ValueChanged<XFile?> onChange;

  const ImageSelector({
    super.key,
    required this.builder,
    required this.onChange,
  });

  @override
  State<ImageSelector> createState() => _ImageSelectorState();
}

class _ImageSelectorState extends State<ImageSelector> {
  XFile? _selectedImage;

  Future<void> _onSelect() async {
    try {
      final ImagePicker imagePicker = ImagePicker();
      imagePicker.pickImage(source: ImageSource.gallery).then((XFile? pickedImage) {
        if (mounted && pickedImage != null) {
          if (_selectedImage?.name != pickedImage.name) {
            _selectedImage = pickedImage;
            widget.onChange(_selectedImage);
          } else {
            SnackBars.of(context).showWarningSnackBar(
              title: 'Image Already Selected',
              message: 'You have already added this image. Please choose a different photo.',
            );
          }
        }
      });
    } catch (error) {
      SnackBars.of(context).showErrorSnackBar(
        title: 'Image Selection Failed',
        message: 'We couldn’t access your gallery. Please try again.',
      );
    }
  }

  Future<void> _onRemove() async {
    if (_selectedImage != null) {
      final file = File(_selectedImage!.path);
      if (await file.exists()) {
        await file.delete();
      }

      _selectedImage = null;
      widget.onChange(_selectedImage);
    }
  }

  @override
  Widget build(BuildContext context) {
    return widget.builder(
      context,
      _selectedImage,
      _onSelect,
      _onRemove,
    );
  }
}
