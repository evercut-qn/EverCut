// lib/features/settings/modules/business_profile/presentation/utils/shop_image_section_path.dart

import 'package:flutter/widgets.dart';

import '../../../../../../shared/extensions/context/device_metrics_extension.dart';

Path shopImageSectionPath(BuildContext context, Size size) {
  final double cornerRadius = context.scale(12);

  final Path path = Path();

  final double rightLineHeight = size.height * 0.7;
  final double innerLineSize = size.height * 0.3;

  path.moveTo(cornerRadius, 0);

  final List<Offset> topRightCorner = <Offset>[
    Offset(size.width - cornerRadius, 0),
    Offset(size.width, cornerRadius),
  ];

  path.lineTo(topRightCorner.first.dx, topRightCorner.first.dy);
  path.arcToPoint(topRightCorner.last, radius: Radius.circular(cornerRadius));

  final List<Offset> bottomRightTopRightCorner = <Offset>[
    Offset(size.width, rightLineHeight - cornerRadius),
    Offset(size.width - cornerRadius, rightLineHeight),
  ];

  path.lineTo(bottomRightTopRightCorner.first.dx, bottomRightTopRightCorner.first.dy);
  path.arcToPoint(bottomRightTopRightCorner.last, radius: Radius.circular(cornerRadius));

  final List<Offset> bottomRightTopLeftCorner = <Offset>[
    Offset(size.width - (innerLineSize - cornerRadius) + context.scale(16), rightLineHeight),
    Offset(size.width - innerLineSize, rightLineHeight + cornerRadius + context.scale(16)),
  ];

  path.lineTo(bottomRightTopLeftCorner.first.dx, bottomRightTopLeftCorner.first.dy);
  path.arcToPoint(bottomRightTopLeftCorner.last, radius: Radius.circular(context.scale(30)), clockwise: false);

  final List<Offset> bottomRightBottomLeftCorner = <Offset>[
    Offset(size.width - innerLineSize, size.height - cornerRadius),
    Offset(size.width - (innerLineSize + cornerRadius), size.height),
  ];

  path.lineTo(bottomRightBottomLeftCorner.first.dx, bottomRightBottomLeftCorner.first.dy);
  path.arcToPoint(bottomRightBottomLeftCorner.last, radius: Radius.circular(cornerRadius));

  final List<Offset> bottomLeftCorner = <Offset>[
    Offset(cornerRadius, size.height),
    Offset(0, size.height - cornerRadius),
  ];

  path.lineTo(bottomLeftCorner.first.dx, bottomLeftCorner.first.dy);
  path.arcToPoint(bottomLeftCorner.last, radius: Radius.circular(cornerRadius));

  final List<Offset> topLeftCorner = <Offset>[
    Offset(0, cornerRadius),
    Offset(cornerRadius, 0),
  ];

  path.lineTo(topLeftCorner.first.dx, topLeftCorner.first.dy);
  path.arcToPoint(topLeftCorner.last, radius: Radius.circular(cornerRadius));

  path.close();

  return path;
}
