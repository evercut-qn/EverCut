// lib/features/image_gallery/presentation/widgets/carousel_slider_control_and_indicator.dart

part of 'carousel_slider.dart';

class CarouselSliderControlAndIndicator extends StatefulWidget {
  final int activeIndex;
  final VoidCallback onNextButtonTap;
  final VoidCallback onPreviousButtonTap;
  final ValueSetter<bool> onTogglePlayback;

  const CarouselSliderControlAndIndicator({
    super.key,
    required this.activeIndex,
    required this.onNextButtonTap,
    required this.onPreviousButtonTap,
    required this.onTogglePlayback,
  });

  @override
  State<CarouselSliderControlAndIndicator> createState() => _CarouselSliderControlAndIndicatorState();
}

class _CarouselSliderControlAndIndicatorState extends State<CarouselSliderControlAndIndicator> {
  bool _isPlaying = true;

  void _onTogglePlayback() {
    setState(() {
      _isPlaying = !_isPlaying;
    });

    // Inform's the parent widget about the change.
    widget.onTogglePlayback(_isPlaying);
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      spacing: context.scale(72),
      children: [
        Container(
          height: context.scale(42),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(context.scale(12)),
            color: LightColorTokens.neutralShade650.withAlpha(127),
          ),
          padding: EdgeInsets.all(context.scale(12)),
          child: Center(
            child: Row(
              spacing: context.scale(10),
              children: [
                InkWell(
                  onTap: _onTogglePlayback,
                  splashFactory: NoSplash.splashFactory,
                  child: Icon(
                    _isPlaying ? AppIcons.solidRoundedPause : AppIcons.solidRoundedPlay,
                    color: LightColorTokens.greenShade100,
                    size: context.scale(16),
                  ),
                ),
                SizedBox(
                  height: context.scale(18),
                  child: VerticalDivider(
                    color: LightColorTokens.neutralShade250,
                    width: 1.0,
                  ),
                ),
                Padding(
                  padding: EdgeInsets.symmetric(horizontal: context.scale(4.25)),
                  child: AnimatedSmoothIndicator(
                    activeIndex: widget.activeIndex,
                    count: 3,
                    curve: Curves.easeInOut,
                    duration: const Duration(milliseconds: 300),
                    effect: ExpandingDotsEffect(
                      activeDotColor: LightColorTokens.greenShade100,
                      dotColor: LightColorTokens.neutralShade350,
                      dotHeight: context.scale(8),
                      dotWidth: context.scale(8),
                      radius: context.scale(4),
                      spacing: context.scale(6),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        Row(
          spacing: context.scale(12),
          children: [
            CarouselSliderIconButton(
              icon: Icons.chevron_left,
              onTap: widget.onPreviousButtonTap,
            ),
            CarouselSliderIconButton(
              icon: Icons.chevron_right,
              onTap: widget.onNextButtonTap,
            ),
          ],
        ),
      ],
    );
  }
}
