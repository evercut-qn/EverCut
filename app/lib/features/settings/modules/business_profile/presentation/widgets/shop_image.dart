// lib/features/settings/modules/business_profile/presentation/widgets/shop_image.dart

import 'package:flutter/material.dart';

import '../../../../../../core/theme/foundation/app_icons.dart';
import '../../../../../../core/theme/foundation/colors/light_color_tokens.dart';
import '../../../../../../shared/extensions/context/app_colors_extension.dart';
import '../../../../../../shared/extensions/context/device_metrics_extension.dart';
import '../clippers/shop_image_section_clipper.dart';
import '../painters/shop_image_section_painter.dart';

class ShopImageWidget extends StatelessWidget {
  final String? coverUrl;
  final String bio;

  const ShopImageWidget({
    super.key,
    this.coverUrl,
    this.bio = '',
  });

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 1.25,
      child: LayoutBuilder(
        builder: (BuildContext context, BoxConstraints constraints) {
          return Stack(
            children: [
              Positioned.fill(
                child: CustomPaint(
                  painter: ShopImageSectionPainter(context),
                  child: ClipPath(
                    clipBehavior: Clip.hardEdge,
                    clipper: ShopImageSectionClipper(context),
                    child: Stack(
                      children: [
                        Positioned.fill(
                          child: Material(
                            color: Colors.transparent,
                          ),
                        ),
                        if (coverUrl != null)
                          Positioned.fill(
                            child: Image.network(
                              coverUrl!,
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stackTrace) {
                                return Container(
                                  color: context.appColors.backgroundShade200,
                                );
                              },
                            ),
                          ),
                        Positioned.fill(
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.topCenter,
                                colors: const [Colors.transparent, Colors.black54],
                                end: Alignment.bottomCenter,
                              ),
                            ),
                            child: Align(
                              alignment: Alignment.bottomLeft,
                              child: Padding(
                                padding: EdgeInsets.all(context.scale(18)),
                                child: SizedBox(
                                  width: constraints.maxWidth - constraints.maxHeight * 0.3 - context.scale(34),
                                  child: Text(
                                    bio,
                                    maxLines: 2,
                                    style: TextStyle(
                                      color: LightColorTokens.scaffoldBackgroundColor,
                                      fontSize: context.scale(18),
                                      fontWeight: FontWeight.w700,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              Positioned(
                bottom: 0,
                right: 0,
                child: Material(
                  clipBehavior: Clip.hardEdge,
                  color: context.appColors.backgroundShade75,
                  shape: CircleBorder(
                    side: BorderSide(
                      color: context.appColors.backgroundShade200,
                      width: context.scale(2),
                    ),
                  ),
                  child: InkWell(
                    highlightColor: context.appColors.backgroundShade200.withAlpha(63),
                    onTap: () {},
                    splashColor: context.appColors.backgroundShade200.withAlpha(127),
                    child: SizedBox.square(
                      dimension: constraints.maxHeight * 0.3 - context.scale(16),
                      child: Icon(
                        AppIcons.solidRoundedImageUpload,
                        color: context.appColors.neutralShade650,
                        size: context.scale(20),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
