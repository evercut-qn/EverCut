// lib/features/image_gallery/presentation/cubit/image_gallery_state.dart

part of 'image_gallery_cubit.dart';

class ImageGalleryState extends Equatable {
  final bool isScrolling;

  const ImageGalleryState({
    required this.isScrolling,
  });

  factory ImageGalleryState.defaultState() {
    return ImageGalleryState(
      isScrolling: false,
    );
  }

  ImageGalleryState copyWith({
    bool? isScrolling,
  }) {
    return ImageGalleryState(
      isScrolling: isScrolling ?? this.isScrolling,
    );
  }

  @override
  List<Object?> get props => [isScrolling];
}
