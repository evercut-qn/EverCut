// lib/features/image_gallery/presentation/cubit/image_gallery_cubit.dart

import 'package:equatable/equatable.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

part 'image_gallery_state.dart';

class ImageGalleryCubit extends Cubit<ImageGalleryState> {
  final ScrollController scrollController = ScrollController();

  ImageGalleryCubit() : super(ImageGalleryState.defaultState()) {
    scrollController.addListener(_scrollControllerListener);
  }

  void _scrollControllerListener() {
    final shouldBeScrolling = scrollController.offset > 125.0;
    if (state.isScrolling != shouldBeScrolling) {
      emit(state.copyWith(isScrolling: shouldBeScrolling));
    }
  }

  @override
  Future<void> close() {
    scrollController.removeListener(_scrollControllerListener);
    scrollController.dispose();
    return super.close();
  }
}
