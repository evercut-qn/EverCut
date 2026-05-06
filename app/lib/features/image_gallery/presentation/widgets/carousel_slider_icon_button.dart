// lib/features/image_gallery/presentation/widgets/carousel_slider_icon_button.dart

part of 'carousel_slider.dart';

class CarouselSliderIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;

  const CarouselSliderIconButton({
    super.key,
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: LightColorTokens.neutralShade650.withAlpha(127),
      clipBehavior: Clip.hardEdge,
      shape: CircleBorder(),
      child: InkWell(
        onTap: onTap,
        splashColor: LightColorTokens.neutralShade950.withAlpha(31),
        child: SizedBox(
          height: context.scale(42),
          width: context.scale(42),
          child: Center(
            child: Icon(
              icon,
              color: LightColorTokens.neutralShade350,
              size: context.scale(24),
            ),
          ),
        ),
      ),
    );
  }
}
