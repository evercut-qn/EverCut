// lib/features/image_gallery/presentation/widgets/carousel_slider.dart

import 'package:carousel_slider/carousel_slider.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:smooth_page_indicator/smooth_page_indicator.dart';

import '../../../../core/theme/foundation/app_icons.dart';
import '../../../../core/theme/foundation/colors/light_color_tokens.dart';
import '../../../../shared/extensions/context/device_metrics_extension.dart';

part 'carousel_slider_icon_button.dart';
part 'carousel_slider_control_and_indicator.dart';

class CustomCarouselSlider extends StatefulWidget {
  const CustomCarouselSlider({super.key});

  @override
  State<CustomCarouselSlider> createState() => _CustomCarouselSliderState();
}

class _CustomCarouselSliderState extends State<CustomCarouselSlider> {
  int _activeIndex = 0;
  bool _autoPlay = true;

  final CarouselSliderController _carouselController = CarouselSliderController();

  void _onTogglePlayback(bool value) {
    setState(() {
      _autoPlay = value;
    });
  }

  void _onNextButtonTap() => _carouselController.nextPage();
  void _onPreviousButtonTap() => _carouselController.previousPage();

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 1.25,
      child: Stack(
        children: [
          Positioned.fill(
            child: CarouselSlider(
              carouselController: _carouselController,
              items: [
                SizedBox.expand(child: ColoredBox(color: Colors.grey)),
                SizedBox.expand(child: ColoredBox(color: Colors.green)),
                SizedBox.expand(child: ColoredBox(color: Colors.red)),
              ],
              options: CarouselOptions(
                aspectRatio: 1.25,
                autoPlay: _autoPlay,
                autoPlayInterval: const Duration(seconds: 10),
                onPageChanged: (index, reason) => setState(() {
                  _activeIndex = index;
                }),
                viewportFraction: 1.0,
              ),
            ),
          ),
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: AlignmentGeometry.topCenter,
                  colors: [
                    Colors.transparent,
                    Colors.black,
                  ],
                  end: AlignmentGeometry.bottomCenter,
                ),
              ),
            ),
          ),
          Positioned(
            left: 0,
            top: context.systemPadding.top,
            right: 0,
            bottom: 0,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              spacing: context.scale(72),
              children: [
                if (context.canPop()) ...[
                  Padding(
                    padding: EdgeInsets.all(context.scale(8)),
                    child: BackButton(
                      color: LightColorTokens.neutralShade150,
                    ),
                  ),
                ] else ...[
                  const SizedBox.shrink(),
                ],
                Padding(
                  padding: EdgeInsets.all(context.scale(24)),
                  child: CarouselSliderControlAndIndicator(
                    activeIndex: _activeIndex,
                    onNextButtonTap: _onNextButtonTap,
                    onPreviousButtonTap: _onPreviousButtonTap,
                    onTogglePlayback: _onTogglePlayback,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
