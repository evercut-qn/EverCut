// lib/features/settings/modules/business_profile/presentation/clippers/shop_image_section_clipper.dart

import 'package:flutter/material.dart';

import '../utils/shop_image_section_path.dart';

class ShopImageSectionClipper extends CustomClipper<Path> {
  final BuildContext context;

  const ShopImageSectionClipper(this.context);

  @override
  Path getClip(Size size) {
    return shopImageSectionPath(context, size);
  }

  @override
  bool shouldReclip(covariant CustomClipper<dynamic> oldClipper) {
    return false;
  }
}
